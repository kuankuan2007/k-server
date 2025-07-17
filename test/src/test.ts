import { createServer, Router } from '../../src';
import logControl from '@kuankuan/log-control';
const result = createServer();
result.routers.main.addRouter(
  new Router({
    matcher: 'test',
    name: 'main',
    onRootMatch: async (req, res, ctx, next) => {
      ctx.data = 'hello world';
      req.logger.info('hello world');
      req.logger.debug('debug');
      req.logger.warn('warn');
      result.logApplication.info('info');
      await next();
    },
  })
);

result.logApplication.addRecorder(
  new logControl.ConsoleRecorder({
    startLevel: logControl.Level.All,
  })
);

result.server.listen(3000);
