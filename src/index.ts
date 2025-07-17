import * as http from 'http';
import { ServerRequest, ServerResponse, ServerResponseCtx } from './types.js';
import Router from './router.js';
import { Statue } from './statue.js';
import createResponseTransformer from './transform.js';
import { Writable } from 'stream';
import { mergeUInt8Array } from './common.js';
import getRandomId from './id.js';
import { logging } from './types.js';
import { Application } from '@kuankuan/log-control';
import getAutoCompress from './transformers/autoCompress.js';

function createServer<Global extends object | undefined = undefined>({
  logApplication = new logging.Application({ name: 'server' }),
  setGlobal = () => void 0 as Global,
  addAutoCompress = true,
}: {
  logApplication?: Application;
  setGlobal?: (req: ServerRequest<Global>, res: ServerResponse<Global>) => Global;
  addAutoCompress?: boolean;
} = {}) {
  const responseTransformer = createResponseTransformer<Global>();
  if (addAutoCompress) {
    responseTransformer.use(getAutoCompress());
  }
  async function onRequest(req: ServerRequest<Global>, res: ServerResponse<Global>) {
    req.ourl = new URL(req.url || '/', 'http://localhost/');

    req.uuid = getRandomId();
    req.logger = req.logger = loggers.request.createLogger(req.uuid);
    loggers.request.info(`New Request: ${req.uuid} ({req.method} ${req.url})`);
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
    transformerStream.pipe(res);
    try {
      await root.execute(req.ourl.pathname, req, resProxy, ctx);
    } catch (err) {
      ctx.statue = Statue.SERVER_ERROR;
      req.logger.error(
        `Request Ended By Error: ${err instanceof Error ? err.stack || err.message : String(err)}`
      );
    }
    if (ctx.statue !== Statue.SENDED) {
      if (!resProxy.headersSent) {
        resProxy.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      const data = {
        code: ctx.statue.code,
        msg: ctx.statue.msg,
        ok: ctx.statue.ok,
        data: ctx.data,
      };
      resProxy.write(JSON.stringify(data), () => {
        resProxy.end();
      });
    }
    req.logger.info(`Request Ended: ${ctx.statue.code} ${ctx.statue.msg}`);
  }
  const loggers = {
    request: logApplication.createLogger('request'),
    __k_server: logApplication.createLogger('server'),
  } as const;
  const main = new Router<Global>({
    name: 'main',
    matcher: (nowPath) => {
      if (nowPath === '/') return true;
      return nowPath;
    },
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
  const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse> =
    http.createServer(onRequest as Parameters<typeof http.createServer>[0]);
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
export default Router;
export { createServer, Router, Statue };
export type { ServerRequest, ServerResponse, ServerResponseCtx, Transformer } from './types.js';
