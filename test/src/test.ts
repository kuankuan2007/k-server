import { createServer, Router, Statue, restSender } from '../../src';
import fs from 'fs';
import logControl from '@kuankuan/log-control';
const result = createServer({
  sender: restSender,
});

const TEST_HOST = '127.0.0.1',
  TEST_PORT_START = 3000,
  TEST_PORT_END = 3020;

result.routers.main.addRouter(
  new Router({
    matcher: 'test',
    name: 'main',
    onRootMatch: async (req, _res, ctx, next) => {
      ctx.data = 'hello world';
      req.logger.info('hello world from /test router');
      await next();
    },
  })
);
result.routers.main.addRouter(
  new Router({
    matcher: '400',
    name: 'main',
    onRootMatch: async (req, _res, ctx, next) => {
      ctx.data = 'This is a 400 error';
      ctx.statue = Statue.NOT_FOUND;
      req.logger.info('hello world from /400 router');
      await next();
    },
  })
);
result.routers.main.addRouter(
  new Router({
    matcher: '500',
    name: 'main',
    onRootMatch: async (req) => {
      req.logger.info('hello world from /500 router');
      throw new Error('This is a 500 error'); // ctx.data = 'This is a 500 error';
    },
  })
);

result.routers.main.addRouter(
  new Router({
    matcher: 'selfcontrol',
    name: 'selfcontrol',
    onRootMatch: async (req, res, ctx, next) => {
      const arg = decodeURIComponent(req.ourl.searchParams.get('arg') || '');
      ctx.statue = Statue.SENDED;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline');
      res.statusCode = 200;
      res.end(Buffer.from(`Hello, ${arg}!\nThis is a self-control response.`, 'utf-8'));
      await next();
    },
  })
);

result.routers.main.addRouter(
  new Router({
    matcher: (nowPath) => {
      return nowPath === '/favicon.ico' || nowPath === '/icon' || nowPath === '/icon.jpg';
    },
    name: 'icon',
    onRootMatch: async (req, res, ctx, next) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'image/jpeg');
      ctx.statue = Statue.RAW_STREAM;
      ctx.data = fs.createReadStream('./test/icon.jpg');
      await next();
    },
  })
);

result.routers.main.addRouter(
  new Router({
    matcher: 'bytes',
    name: 'bytes',
    onRootMatch: async (req, res, ctx, next) => {
      ctx.data = new Uint8Array([75, 117, 97, 110, 107, 117, 97, 110]);
      await next();
    },
  })
);

result.logApplication.addRecorder(
  new logControl.ConsoleRecorder({
    startLevel: logControl.Level.All,
  })
);

async function listen(server: typeof result.server, port: number) {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  server.once('error', reject);
  server.once('listening', resolve);
  server.listen(port, TEST_HOST);
  return promise
    .then(() => {
      testLuncher.info(`Server is listening on ${TEST_HOST}:${port}`);
    })
    .finally(() => {
      server.removeListener('error', reject);
      server.removeListener('listening', resolve);
    });
}
const testLuncher = result.logApplication.createLogger('luncher');
(async () => {
  for (let i = TEST_PORT_START; i <= TEST_PORT_END; i++) {
    try {
      testLuncher.info(`try to listen ${i}`);
      await listen(result.server, i);
      return;
    } catch (err) {
      testLuncher.warn(`Can not listen ${i} port, Because: ${err.message}`);
    }
  }
  testLuncher.fatal('Can not listen any port!');
})();
