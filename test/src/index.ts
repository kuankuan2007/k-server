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
    name: 'index',
    matcher: '',
    onRootMatch: async (statue) => {
      statue.req.logger.trace('index root match');
      statue.ctx.statue = Statue.RAW_STREAM;
      statue.ctx.data = fs.createReadStream('./test/index.html');
    },
  })
);

result.routers.main.addRouter(
  new Router({
    matcher: 'test',
    name: 'test',
    onRootMatch: async (statue) => {
      statue.ctx.data = 'hello world';
      statue.req.logger.info('hello world from /test router');
    },
  })
);
result.routers.main.addRouter(
  new Router({
    matcher: '400',
    name: 'notFound',
    onRootMatch: async (statue) => {
      statue.ctx.data = 'This is a 400 error';
      statue.ctx.statue = Statue.NOT_FOUND;
      statue.req.logger.info('hello world from /400 router');
    },
  })
);
result.routers.main.addRouter(
  new Router({
    matcher: '500',
    name: 'serverError',
    onRootMatch: async (statue) => {
      statue.req.logger.info('hello world from /500 router');
      throw new Error('This is a 500 error'); // ctx.data = 'This is a 500 error';
    },
  })
);

result.routers.main.addRouter(
  new Router({
    matcher: 'selfcontrol',
    name: 'selfcontrol',
    onRootMatch: async (statue) => {
      const arg = decodeURIComponent(statue.req.ourl.searchParams.get('arg') || '');
      statue.ctx.statue = Statue.SENDED;
      statue.res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      statue.res.setHeader('Content-Disposition', 'inline');
      statue.res.statusCode = 200;
      statue.res.end(Buffer.from(`Hello, ${arg}!\nThis is a self-control response.`, 'utf-8'));
    },
  })
);

result.routers.main.addRouter(
  new Router({
    matcher: (nowPath) => {
      return nowPath === '/favicon.ico' || nowPath === '/icon' || nowPath === '/icon.jpg';
    },
    name: 'icon',
    onRootMatch: async (statue) => {
      statue.res.statusCode = 200;
      statue.res.setHeader('Content-Type', 'image/jpeg');
      statue.ctx.statue = Statue.RAW_STREAM;
      statue.ctx.data = fs.createReadStream('./test/icon.jpg');
    },
  })
);

result.routers.main.addRouter(
  new Router({
    matcher: 'bytes',
    name: 'bytes',
    onRootMatch: async (statue) => {
      statue.ctx.data = new Uint8Array([75, 117, 97, 110, 107, 117, 97, 110]);
      statue.ctx.statue = Statue.SENDED;
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
