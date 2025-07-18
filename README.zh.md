# @kuankuan/k-server

一个简单易用的 Node.js 服务器框架。

## 特性

- 轻量级模块化设计
- 基于路由的请求处理
- 内置日志记录，使用 [@kuankuan/log-control](https://www.npmjs.com/package/@kuankuan/log-control)
- 自动响应压缩
- 支持 TypeScript
- 易于扩展和自定义

## 安装

```sh
npm install @kuankuan/k-server
```

## 用法

```ts
import { createServer, Router } from '@kuankuan/k-server';
import logControl from '@kuankuan/log-control';

const serverInstance = createServer();

serverInstance.routers.main.addRouter(
  new Router({ // 添加一个新路由
    matcher: 'test', // 自动匹配 /test 路径
    name: 'main', // 路由名称
    onRootMatch: async (req, res, ctx, next) => {
      ctx.data = 'hello world'; // 向上下文添加数据
      await next(); // 调用下一个钩子
    },
  })
);

serverInstance.logApplication.addRecorder(
  new logControl.ConsoleRecorder({ // 向应用添加一个新的日志记录器。ConsoleRecorder 是内置的记录器，会将日志输出到控制台。
    startLevel: logControl.Level.All, // 控制记录器的日志级别，输出所有日志
  })
);

serverInstance.server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000'); // 启动服务器
});
```

## 脚本

- `npm run build` — 使用 esbuild 和 TypeScript 构建项目
- `npm run lint` — 对源文件运行 ESLint
- `npm run lint:fix` — 运行 ESLint 并自动修复问题
- `npm run test` — 构建并运行测试
- `npm run prettier` — 使用 Prettier 格式化代码

## 许可证

本项目采用 Mozilla Public License 2.0 许可。详情请参阅 [LICENSE](LICENSE)。
