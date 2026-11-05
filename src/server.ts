import type { ServerOptions } from './types.js';
import { TransformerPipeline } from './transform.js';
import logControl, { type Logger, Application } from '@kuankuan/log-control';
import { Router } from './router.js';
import { HTTPStatue } from './statue.js';
import getRandomId from './id.js';
import { mergeUInt8Array } from './common.js';
import { Writable } from 'stream';
import { executeRouter } from './router.js';

import http from 'http';
import { BodyOnlySender } from './sender.js';
import {
  ServerRequest,
  ServerResponse,
  ServerResponseCtx,
  RequestIdGenerator,
  ResponseSenderInterface,
  RequestErrorHandler,
  GlobalSetter,
  TransformStreamPipelineWrapper,
  RequestErrorStage,
} from './types.js';

export class KServer<Global extends object | undefined = undefined> {
  public readonly httpServer: http.Server;
  public readonly listen: http.Server['listen'];
  public readonly loggers: { readonly request: Logger };
  public readonly routers: { readonly main: Router<Global>; readonly root: Router<Global> };
  public readonly responseTransformerPipeline: TransformerPipeline<Global>;
  public readonly requestIdGenerator: RequestIdGenerator<Global>;
  public readonly sender: ResponseSenderInterface<Global>;
  public readonly logApplication: Application;
  protected readonly errorHandler: RequestErrorHandler<Global>;
  protected readonly setGlobal: GlobalSetter<Global>;
  constructor(options: ServerOptions<Global> = {}) {
    this.httpServer = options.server ?? http.createServer();
    this.listen = this.httpServer.listen.bind(this.httpServer);
    this.responseTransformerPipeline = Array.isArray(options.responseTransformers)
      ? new TransformerPipeline<Global>(options.responseTransformers)
      : (options.responseTransformers ?? new TransformerPipeline<Global>([]));

    this.routers = {
      main: new Router<Global>({
        name: 'main',
        onRootMatch: async (statue) => {
          statue.ctx.statue = HTTPStatue.NOT_FOUND;
        },
        onNoMatch: async (statue) => {
          statue.ctx.statue = HTTPStatue.NOT_FOUND;
        },
      }),
      root: new Router<Global>({
        name: 'root',
      }),
    };
    this.routers.root.addRouter(this.routers.main);
    this.httpServer.on('request', (req, res) => this.handleRequest(req, res));
    this.errorHandler = options.errorHandler ?? this.defaultErrorHandler.bind(this);
    this.requestIdGenerator = options.requestIdGenerator ?? getRandomId;
    this.sender = options.sender ?? new BodyOnlySender();
    this.setGlobal = options.setGlobal ?? (() => void 0 as Global);
    this.logApplication = options.logApplication ?? new logControl.Application({ name: 'server' });
    this.loggers = {
      request: this.logApplication.createLogger('request'),
    };
  }
  protected async defaultErrorHandler(
    _err: unknown,
    _stage: RequestErrorStage,
    req: ServerRequest<Global>,
    res: ServerResponse<Global>,
    rawRes: ServerResponse<Global>,
    ctx: ServerResponseCtx,
    sender: ResponseSenderInterface<Global>
  ) {
    if (rawRes.headersSent || rawRes.destroyed) {
      rawRes.destroy();
      res.destroy();
      return;
    }
    ctx.statue = HTTPStatue.INTERNAL_SERVER_ERROR;
    ctx.data = void 0;
    await sender.send(ctx, req, res);
  }
  protected async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const ctx: ServerResponseCtx = {
      data: void 0,
      statue: new HTTPStatue(),
    };
    const rawRequest = req as ServerRequest<Global>;
    const rawResponse = res as ServerResponse<Global>;
    rawResponse.isProxy = false;
    let defaultErrorResponse = rawResponse;
    const abortController = new AbortController();
    let errorHandled = false;
    let requestErrorLogger: Logger = this.loggers.request;
    const handleError = async (
      err: unknown,
      stage: RequestErrorStage,
      errorResponse = defaultErrorResponse
    ) => {
      if (errorHandled) return;
      errorHandled = true;
      abortController.abort();
      requestErrorLogger.warn(
        `Request ${rawRequest.requestId ?? ''} Ended In ${stage} With Error: ${err instanceof Error ? err.stack || err.message : String(err)}`
      );
      try {
        await this.errorHandler(
          err,
          stage,
          rawRequest,
          errorResponse,
          rawResponse,
          ctx,
          this.sender
        );
      } catch (handlerError) {
        requestErrorLogger.error(
          `Error handler failed: ${handlerError instanceof Error ? handlerError.stack || handlerError.message : String(handlerError)}`
        );
        rawResponse.destroy();
      }
    };
    rawResponse.on('error', (err) => {
      handleError(err, RequestErrorStage.RESPONSE_STREAM);
    });
    res.on('finish', () => {
      rawRequest.logger?.info(`Response Data Sent`);
    });

    let _stage = RequestErrorStage.PREPARATION;
    try {
      rawRequest.ourl = new URL(req.url || '/', 'http://localhost/');
      rawRequest.requestId = this.requestIdGenerator(rawRequest, rawResponse);
      rawRequest.logger =
        rawResponse.logger =
        requestErrorLogger =
          this.loggers.request.createLogger(rawRequest.requestId);

      this.loggers.request.info(
        `New Request: ${rawRequest.requestId} (${rawRequest.method} ${rawRequest.url})`
      );
      rawRequest.global = rawResponse.global = this.setGlobal(rawRequest, rawResponse);
      let bodyPromise: Promise<Uint8Array> | undefined = void 0;
      rawRequest.body = () => {
        if (!bodyPromise) {
          bodyPromise = new Promise((resolve, reject) => {
            const datas: Uint8Array[] = [];
            rawRequest.on('data', (data: Uint8Array) => {
              datas.push(data);
            });
            rawRequest.on('end', () => {
              resolve(mergeUInt8Array(...datas));
            });
            rawRequest.on('error', reject);
          });
        }
        return bodyPromise;
      };

      rawRequest.json = async () => {
        return JSON.parse(new TextDecoder('utf-8').decode(await rawRequest.body()));
      };
      let transformerPipelineWrapper: TransformStreamPipelineWrapper | undefined = void 0;
      let proxiedResponse: ServerResponse<Global> | undefined = void 0;
      _stage = RequestErrorStage.TRANSFORM_STREAM_CREATE;
      try {
        transformerPipelineWrapper = this.responseTransformerPipeline.createTransformStream(
          rawRequest,
          rawResponse
        );
        proxiedResponse = new Proxy<ServerResponse<Global>>(rawResponse, {
          get(target, p) {
            if (p === 'isProxy') {
              return true;
            }
            let result: unknown = target[p as keyof ServerResponse<Global>];
            if (p in transformerPipelineWrapper!.stream && p !== 'on' && p !== 'addListener') {
              result = transformerPipelineWrapper!.stream[p as keyof Writable];
              if (typeof result === 'function') {
                result = result.bind(transformerPipelineWrapper!.stream);
              }
            }
            return result;
          },
        });
        transformerPipelineWrapper.stream.on('error', (err) => {
          try {
            transformerPipelineWrapper?.cancel();
          } catch {
            // ignore
          }
          try {
            transformerPipelineWrapper?.stream?.unpipe(res);
          } catch {
            // ignore
          }
          handleError(err, RequestErrorStage.TRANSFORM_STREAM, rawResponse);
        });
        transformerPipelineWrapper.stream.pipe(res);
        defaultErrorResponse = proxiedResponse;
      } catch (err) {
        defaultErrorResponse = rawResponse;

        if (transformerPipelineWrapper) {
          try {
            transformerPipelineWrapper.cancel();
          } catch {
            // ignore
          }
          try {
            transformerPipelineWrapper.stream.unpipe(res);
          } catch {
            // ignore
          }
        }
        throw err;
      }

      _stage = RequestErrorStage.ROUTER_MATCH;
      const matchResult = await this.routers.root.match(rawRequest.ourl.pathname, rawRequest);
      if (abortController.signal.aborted) return;

      _stage = RequestErrorStage.ROUTER_EXECUTE;
      await executeRouter(matchResult, rawRequest, proxiedResponse, ctx, abortController.signal);
      if (abortController.signal.aborted) return;

      _stage = RequestErrorStage.SEND;
      const _sender = ctx.statue.specialSender || this.sender;
      await _sender.send(ctx, rawRequest, proxiedResponse);
      if (abortController.signal.aborted) return;

      rawRequest.logger.info(`Request processing completed: ${ctx.statue.code} ${ctx.statue.msg}`);
    } catch (err) {
      await handleError(err, _stage);
    }
  }
}
