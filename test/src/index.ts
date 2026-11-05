import { KServer, Router, Statue, HTTPStatue, RESTSender } from '../../src/index.js';
import { AutoCompressTransformer } from '../../src/transformers/autoCompress.js';
import fs from 'fs';
import logControl from '@kuankuan/log-control';
import { parseArgs } from 'node:util';

const args = parseArgs({
  options: {
    port: { type: 'string', default: '3000' },
    host: { type: 'string', default: 'localhost' },
  },
});
const port = parseInt(args.values.port || '3000');

const kServer = new KServer({
  responseTransformers: [new AutoCompressTransformer()],
  sender: new RESTSender(),
});

kServer.routers.main.addRouter(
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

kServer.routers.main.addRouter(
  new Router({
    matcher: 'test',
    name: 'test',
    onRootMatch: async (statue) => {
      statue.ctx.data = 'hello world';
      statue.req.logger.info('hello world from /test router');
    },
  })
);
kServer.routers.main.addRouter(
  new Router({
    matcher: '400',
    name: 'notFound',
    onRootMatch: async (statue) => {
      statue.ctx.data = 'This is a 400 error';
      statue.ctx.statue = HTTPStatue.NOT_FOUND;
      statue.req.logger.info('hello world from /400 router');
    },
  })
);
kServer.routers.main.addRouter(
  new Router({
    matcher: '500',
    name: 'serverError',
    onRootMatch: async (statue) => {
      statue.req.logger.info('hello world from /500 router');
      throw new Error('This is a 500 error'); // ctx.data = 'This is a 500 error';
    },
  })
);

kServer.routers.main.addRouter(
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

kServer.routers.main.addRouter(
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

kServer.routers.main.addRouter(
  new Router({
    matcher: 'bytes',
    name: 'bytes',
    onRootMatch: async (statue) => {
      statue.req.logger.info('hello world from /bytes router');
      statue.ctx.data = new Uint8Array([75, 117, 97, 110, 107, 117, 97, 110]);
    },
  })
);

kServer.routers.main.addRouter(
  new Router({
    matcher: 'now',
    name: 'now',
    onRootMatch: async (statue) => {
      statue.ctx.data = new Date();
    },
  })
);

kServer.logApplication.addRecorder(
  new logControl.ConsoleRecorder({
    startLevel: logControl.Level.All,
  })
);

const testLuncher = kServer.logApplication.createLogger('luncher');

if (args.values.host) {
  kServer.listen(port, args.values.host, () => {
    testLuncher.info(`Server is listening on ${args.values.host}:${port}`);
  });
} else {
  kServer.listen(port, () => {
    testLuncher.info(`Server is listening on localhost:${port}`);
  });
}
