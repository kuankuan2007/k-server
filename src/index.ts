import * as http from 'http';
import {
  ServerRequest,
  ServerResponse,
  ServerResponseCtx,
  Transformer,
  RequestIdGenerator,
  logging,
  ResponseSender,
} from './types.js';
import Router from './router.js';
import Statue from './statue.js';
import { TransformerPipeline } from './transform.js';
import { Writable } from 'stream';
import { mergeUInt8Array } from './common.js';
import getRandomId from './id.js';
import { Application } from '@kuankuan/log-control';
import getAutoCompress from './transformers/autoCompress.js';
import { type Logger } from '@kuankuan/log-control';
import { bodyOnlySender } from './sender.js';
import { executeRouter } from './router.js';
import { TransformStreamPipelineWrapper } from './types.js';
export enum RequestErrorStage {
  PREPARATION = 'PREPARATION',
  TRANSFORM_STREAM_CREATE = 'TRANSFORM_STREAM_CREATE',
  ROUTER_MATCH = 'ROUTER_MATCH',
  ROUTER_EXECUTE = 'ROUTER_EXECUTE',
  SEND = 'SEND',
  TRANSFORM_STREAM = 'TRANSFORM_STREAM',
  RESPONSE_STREAM = 'RESPONSE_STREAM',
}
export type ServerOptions<Global extends object | undefined = undefined> = {
  logApplication?: Application;
  setGlobal?: (req: ServerRequest<Global>, res: ServerResponse<Global>) => Global;
  autoCompressTransformer?: Transformer<Global>;
  server?: http.Server;
  requestIdGenerator?: RequestIdGenerator<Global>;
  sender?: ResponseSender<Global>;
  errorHandler?: (
    err: unknown,
    stage: RequestErrorStage,
    req: ServerRequest<Global>,
    res: ServerResponse<Global>,
    rawRes: ServerResponse<Global>,
    ctx: ServerResponseCtx,
    sender: ResponseSender<Global>
  ) => void | Promise<void>;
};

export function createServer<Global extends object | undefined = undefined>({
  logApplication = new logging.Application({ name: 'server' }),
  setGlobal = () => void 0 as Global,
  autoCompressTransformer = getAutoCompress(),
  server = http.createServer(),
  requestIdGenerator = getRandomId,
  sender = bodyOnlySender,
  errorHandler = async (_err, _stage, req, res, rawRes, ctx, sender) => {
    if (rawRes.headersSent || rawRes.destroyed) {
      rawRes.destroy();
      res.destroy();
      return;
    }
    ctx.statue = Statue.INTERNAL_SERVER_ERROR;
    ctx.data = void 0;
    await sender(ctx, req, res);
  },
}: ServerOptions<Global> = {}) {
  const responseTransformer = new TransformerPipeline<Global>(
    autoCompressTransformer ? [autoCompressTransformer] : []
  );

  async function onRequest(req: ServerRequest<Global>, res: ServerResponse<Global>) {
    const ctx: ServerResponseCtx = {
      data: void 0,
      statue: new Statue(),
    };
    let response = res;
    res.isProxy = false;
    let _stage = RequestErrorStage.PREPARATION;
    let errorHandled = false;
    const abortController = new AbortController();
    let requestErrorLogger: Logger = loggers.request;
    async function handleError(err: unknown, stage: RequestErrorStage, errorResponse = response) {
      if (errorHandled) return;
      errorHandled = true;
      abortController.abort();
      requestErrorLogger.warn(
        `Request ${req.requestId ?? ''} Ended In ${stage} With Error: ${err instanceof Error ? err.stack || err.message : String(err)}`
      );
      try {
        await errorHandler(err, stage, req, errorResponse, res, ctx, sender);
      } catch (handlerError) {
        requestErrorLogger.error(
          `Error handler failed: ${handlerError instanceof Error ? handlerError.stack || handlerError.message : String(handlerError)}`
        );
        res.destroy();
      }
    }
    res.on('error', (err) => {
      handleError(err, RequestErrorStage.RESPONSE_STREAM);
    });
    res.on('finish', () => {
      req.logger.info(`Response Data Sent`);
    });
    _stage = RequestErrorStage.TRANSFORM_STREAM_CREATE;
    try {
      req.ourl = new URL(req.url || '/', 'http://localhost/');
      req.requestId = requestIdGenerator(req, res);
      loggers.request.info(`New Request: ${req.requestId} (${req.method} ${req.url})`);
      req.logger = res.logger = requestErrorLogger = loggers.request.createLogger(req.requestId);
      req.global = res.global = setGlobal(req, res);
      let bodyPromise: Promise<Uint8Array> | undefined = void 0;
      req.body = () => {
        if (!bodyPromise) {
          bodyPromise = new Promise((resolve, reject) => {
            const datas: Uint8Array[] = [];
            req.on('data', (data: Uint8Array) => {
              datas.push(data);
            });
            req.on('end', () => {
              resolve(mergeUInt8Array(...datas));
            });
            req.on('error', reject);
          });
        }
        return bodyPromise;
      };

      req.json = async () => {
        return JSON.parse(new TextDecoder('utf-8').decode(await req.body()));
      };
      let transformerPipelineWrapper: TransformStreamPipelineWrapper | undefined = void 0;
      try {
        transformerPipelineWrapper = responseTransformer.createTransformStream(req, res);
        const resProxy = new Proxy<ServerResponse<Global>>(res, {
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
          } catch (err) {
            // ignore
          }
          try {
            transformerPipelineWrapper?.stream?.unpipe(res);
          } catch (err) {
            // ignore
          }
          handleError(err, RequestErrorStage.TRANSFORM_STREAM, res);
        });
        transformerPipelineWrapper.stream.pipe(res);
        response = resProxy;
      } catch (err) {
        response = res;

        if (transformerPipelineWrapper) {
          try {
            transformerPipelineWrapper.cancel();
          } catch (err) {
            // ignore
          }
          try {
            transformerPipelineWrapper.stream.unpipe(res);
          } catch (err) {
            // ignore
          }
        }
        throw err;
      }

      _stage = RequestErrorStage.ROUTER_MATCH;
      const nowSubRouters = await root.match(req.ourl.pathname, req);
      if (errorHandled) return;
      _stage = RequestErrorStage.ROUTER_EXECUTE;
      await executeRouter(nowSubRouters, req, response, ctx, abortController.signal);
      if (errorHandled) return;
      _stage = RequestErrorStage.SEND;
      const _sender = ctx.statue.specialSender || sender;
      await _sender(ctx, req, response);
      if (errorHandled) return;
      req.logger.info(`Request processing completed: ${ctx.statue.code} ${ctx.statue.msg}`);
    } catch (err) {
      await handleError(err, _stage);
    }
  }
  const loggers = {
    request: logApplication.createLogger('request'),
    __k_server: logApplication.createLogger('server'),
  } as const;
  const main = new Router<Global>({
    name: 'main',
    onRootMatch: async (statue) => {
      statue.ctx.statue = Statue.NOT_FOUND;
    },
    onNoMatch: async (statue) => {
      statue.ctx.statue = Statue.NOT_FOUND;
    },
  });
  const root = new Router<Global>({
    name: 'root',
  });

  root.addRouter(main);

  server.on('request', onRequest);

  return {
    server,
    routers: {
      main,
      root,
    },
    responseTransformer,
    logApplication,
  };
}

export { default as Router, default, matchTop } from './router.js';
export { Statue } from './statue.js';
export { bodyOnlySender, restSender } from './sender.js';
export type {
  ServerRequest,
  ServerResponse,
  ServerResponseCtx,
  Transformer,
  ResponseSender,
} from './types.js';
