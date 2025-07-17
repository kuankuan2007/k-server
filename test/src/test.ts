import { createServer, Router } from '../../src';
import logControl from '@kuankuan/log-control';
const res = createServer();
res.routers.main.addRouter(
  new Router({
    matcher: 'test',
    name: 'main',
    onRootMatch: async (req, res, ctx, next) => {
      ctx.data = 'hello world';
      await next();
    },
  })
);

res.logApplication.addRecorder(
  new logControl.ConsoleRecorder({
    startLevel: logControl.Level.All,
  })
);

res.server.listen(3000);
