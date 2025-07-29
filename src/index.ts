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
import createResponseTransformer from './transform.js';
import { Writable } from 'stream';
import { mergeUInt8Array } from './common.js';
import getRandomId from './id.js';
import { Application } from '@kuankuan/log-control';
import getAutoCompress from './transformers/autoCompress.js';

import { bodyOnlySender } from './sender.js';

export function createServer<Global extends object | undefined = undefined>({
  logApplication = new logging.Application({ name: 'server' }),
  setGlobal = () => void 0 as Global,
  autoCompressTransformer = getAutoCompress(),
  server = http.createServer(),
  requestIdGenerator = getRandomId,
  sender = bodyOnlySender,
}: {
  logApplication?: Application;
  setGlobal?: (req: ServerRequest<Global>, res: ServerResponse<Global>) => Global;
  autoCompressTransformer?: Transformer<Global>;
  server?: http.Server;
  requestIdGenerator?: RequestIdGenerator<Global>;
  sender?: ResponseSender<Global>;
} = {}) {
  const responseTransformer = createResponseTransformer<Global>();
  if (autoCompressTransformer) {
    responseTransformer.use(autoCompressTransformer);
  }
  async function onRequest(req: ServerRequest<Global>, res: ServerResponse<Global>) {
    req.ourl = new URL(req.url || '/', 'http://localhost/');
    req.uuid = requestIdGenerator(req, res);

    req.logger = req.logger = loggers.request.createLogger(req.uuid);
    loggers.request.info(`New Request: ${req.uuid} (${req.method} ${req.url})`);
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
    const ctx: ServerResponseCtx = {
      data: void 0,
      statue: new Statue(),
    };
    const transformerStream = responseTransformer.createTransformStream(req, res);
    let _err: unknown | undefined;
    const resProxy = new Proxy<ServerResponse<Global>>(res, {
      get(target, p) {
        let result: unknown = target[p as keyof ServerResponse<Global>];
        if (p in transformerStream && p !== 'on' && p !== 'addListener') {
          result = transformerStream[p as keyof Writable];
          if (typeof result === 'function') {
            result = result.bind(transformerStream);
          }
        }
        return result;
      },
    });
    res.on('finish', () => {
      req.logger.info(`Response Data Sent`);
    });
    res.on('error', (err) => {
      req.logger.error(
        `Request Ended By Error: ${err instanceof Error ? err.stack || err.message : String(err)}`
      );
    });
    transformerStream.pipe(res);
    try {
      await root.execute(req.ourl.pathname, req, resProxy, ctx);
    } catch (err) {
      req.logger.error(
        `Request Ended By Error: ${err instanceof Error ? err.stack || err.message : String(err)}`
      );
      _err = err;
    }
    const _sender = ctx.statue.specialSender || sender;
    _sender(ctx, _err, req, resProxy);
    req.logger.info(`Request processing completed: ${ctx.statue.code} ${ctx.statue.msg}`);
  }
  const loggers = {
    request: logApplication.createLogger('request'),
    __k_server: logApplication.createLogger('server'),
  } as const;
  const main = new Router<Global>({
    name: 'main',
    onRootMatch: async (_req, res, ctx) => {
      res.statusCode = 404;
      ctx.statue = Statue.NOT_FOUND;
    },
    onNoMatch: async (_req, res, ctx) => {
      res.statusCode = 404;
      ctx.statue = Statue.NOT_FOUND;
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
