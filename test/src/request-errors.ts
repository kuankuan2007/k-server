import assert from 'node:assert/strict';
import { get, Server } from 'node:http';
import { test } from 'node:test';
import { PassThrough, Transform } from 'node:stream';
import { createServer, RequestErrorStage, Router, ServerOptions, Statue } from '../../src/index.js';

async function request(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  try {
    return await new Promise((resolve, reject) => {
      get(`http://127.0.0.1:${address.port}/`, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve(body));
        response.on('error', reject);
      }).on('error', reject);
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

for (const failingStage of Object.values(RequestErrorStage)) {
  test(`stops processing on ${failingStage} errors`, async () => {
    const error = new Error(failingStage);
    const calls: string[] = [];
    const options: ServerOptions = {
      requestIdGenerator: () => {
        calls.push('prepare');
        if (failingStage === RequestErrorStage.PREPARATION) throw error;
        return 'test';
      },
      sender: (_ctx, _req, res) => {
        calls.push('send');
        if (failingStage === RequestErrorStage.SEND) throw error;
        res.end('normal');
      },
      errorHandler: async (actualError, stage, _req, res, ctx) => {
        calls.push('error');
        assert.equal(actualError, error);
        assert.equal(stage, failingStage);
        assert(ctx.statue);
        await Promise.resolve();
        res.end('handled');
      },
    };
    const result = createServer(options);
    result.routers.main.addRouter(new Router({
      name: 'failure',
      matcher: () => {
        calls.push('match');
        if (failingStage === RequestErrorStage.ROUTER_MATCH) throw error;
        return true;
      },
      onRootMatch: async () => {
        calls.push('execute');
        if (failingStage === RequestErrorStage.ROUTER_EXECUTE) throw error;
      },
    }));

    assert.equal(await request(result.server), 'handled');
    const expected = ['prepare', 'match', 'execute', 'send'];
    assert.deepEqual(calls, [...expected.slice(0, Object.values(RequestErrorStage).indexOf(failingStage) + 1), 'error']);
  });
}

test('default error handler handles failures before the request logger exists', async () => {
  const result = createServer({
    requestIdGenerator: () => { throw new Error('preparation failed'); },
  });
  const body = JSON.parse(await request(result.server));
  assert.equal(body.code, 500);
  assert.equal(body.ok, false);
});

test('default error handler replaces a special sender after a router error', async () => {
  const result = createServer();
  result.routers.main.addRouter(new Router({
    name: 'failure',
    matcher: '',
    onRootMatch: async ({ ctx }) => {
      ctx.statue = Statue.RAW_STREAM;
      throw new Error('router failed');
    },
  }));
  const body = JSON.parse(await request(result.server));
  assert.equal(body.code, 500);
  assert.equal(body.ok, false);
});

test('handles asynchronous transformer errors during sending', async () => {
  const stages: RequestErrorStage[] = [];
  const result = createServer({
    autoCompressTransformer: {
      name: 'failure',
      level: 0,
      transformer: () => new Transform({
        transform(_chunk, _encoding, callback) {
          callback(new Error('transform failed'));
        },
      }),
    },
    errorHandler: (_error, stage, _req, res) => {
      stages.push(stage);
      res.end('handled');
    },
  });
  assert.equal(await request(result.server), 'handled');
  assert.deepEqual(stages, [RequestErrorStage.SEND]);
});

test('handles asynchronous sender errors', async () => {
  const stages: RequestErrorStage[] = [];
  const result = createServer({
    sender: async () => {
      await Promise.resolve();
      throw new Error('send failed');
    },
    errorHandler: (_error, stage, _req, res) => {
      stages.push(stage);
      res.end('handled');
    },
  });
  assert.equal(await request(result.server), 'handled');
  assert.deepEqual(stages, [RequestErrorStage.SEND]);
});

test('does not execute routers after a transformer error during matching', async () => {
  const calls: string[] = [];
  let releaseMatch: (() => void) | undefined;
  const result = createServer({
    autoCompressTransformer: {
      name: 'failure',
      level: 0,
      transformer: () => {
        const stream = new PassThrough();
        setImmediate(() => stream.destroy(new Error('transform failed')));
        return stream;
      },
    },
    errorHandler: (_error, stage, _req, res) => {
      calls.push(stage);
      res.end('handled');
      releaseMatch?.();
    },
  });
  result.routers.main.addRouter(new Router({
    name: 'waiting',
    matcher: () => new Promise<boolean>((resolve) => { releaseMatch = () => resolve(true); }),
    onRootMatch: async () => { calls.push('execute'); },
  }));
  assert.equal(await request(result.server), 'handled');
  assert.deepEqual(calls, [RequestErrorStage.ROUTER_MATCH]);
});

test('does not continue the router chain after a transformer error', async () => {
  const calls: string[] = [];
  let releaseRouter: (() => void) | undefined;
  let routerFinished: (() => void) | undefined;
  const finished = new Promise<void>((resolve) => { routerFinished = resolve; });
  const result = createServer({
    autoCompressTransformer: {
      name: 'failure',
      level: 0,
      transformer: () => {
        const stream = new PassThrough();
        setImmediate(() => stream.destroy(new Error('transform failed')));
        return stream;
      },
    },
    errorHandler: (_error, stage, _req, res) => {
      calls.push(stage);
      res.end('handled');
      releaseRouter?.();
    },
  });
  result.routers.main.addRouter(new Router({
    name: 'first',
    matcher: '',
    onRootMatch: async ({ next }) => {
      await new Promise<void>((resolve) => { releaseRouter = resolve; });
      await next();
      routerFinished?.();
    },
  }));
  result.routers.main.addRouter(new Router({
    name: 'second',
    matcher: '',
    onRootMatch: async () => { calls.push('second'); },
  }));
  assert.equal(await request(result.server), 'handled');
  await finished;
  assert.deepEqual(calls, [RequestErrorStage.ROUTER_EXECUTE]);
});