import '@kuankuan/assist-2024';
import http from 'http';
import { ServerRequest, ServerResponse, ServerResponseCtx } from './types.js';
import Router from './router.js';
import { NOT_FOUND, SENDED, SERVER_ERROR, Statue } from './globalCodes.js';
import createResponseTransformer from './responseTransform.js';
import { Writable } from 'stream';
import { mergeUInt8Array } from './common.js';
export function createServer<Global extends object>() {
  const responseTransformer = createResponseTransformer<Global>();
  async function onRequest(req: ServerRequest<Global>, res: ServerResponse<Global>) {
    req.ourl = new URL(req.url || '/', 'http://localhost/');
    req.global = res.global = {} as Global;
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
    req.kjson = async () => {
      return KJSON.parse(new TextDecoder('utf-8').decode(await req.body()));
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
      ctx.statue = SERVER_ERROR;
    }
    if (ctx.statue !== SENDED) {
      if (!resProxy.headersSent) {
        resProxy.setHeader('Content-Type', 'application/k-json; charset=utf-8');
      }
      const data = {
        ...ctx.statue,
        data: ctx.data,
      };
      resProxy.write(KJSON.stringify(data), () => {
        resProxy.end();
      });
    }
  }
  const main = new Router<Global>({
    name: 'main',
    matcher: (nowPath) => {
      if (nowPath === '/') return true;
      return nowPath;
    },
    onRootMatch: async (_req, res, ctx) => {
      res.statusCode = 404;
      ctx.statue = NOT_FOUND;
    },
    onNoMatch: async (_req, res, ctx) => {
      res.statusCode = 404;
      ctx.statue = NOT_FOUND;
    },
  });
  const root = new Router<Global>({
    name: 'root',
  });

  root.addRouter(main);
  const server = http.createServer(onRequest as Parameters<typeof http.createServer>[0]);
  return {
    server,
    routers: {
      main,
      root,
    },
    responseTransformer,
  };
}
export default Router;
