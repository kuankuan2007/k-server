# @kuankuan/k-server

一个简单易用的 Node.js 服务器框架。

## 特性

- 轻量级模块化设计
- 基于路由的请求处理
- 内置日志记录，使用 [@kuankuan/log-control](https://www.npmjs.com/package/@kuankuan/log-control)
- 可组合的响应转换器（自动压缩需显式启用）
- 支持 TypeScript
- 易于扩展和自定义

## 安装

```sh
npm install @kuankuan/k-server
```

## 用法

响应转换器需显式配置。若要启用自动响应压缩，请将 `AutoCompressTransformer` 添加到 `responseTransformers`。

```ts
import { KServer, Router, restSender, Statue } from '@kuankuan/k-server';
import logControl from '@kuankuan/log-control';
import { AutoCompressTransformer } from '@kuankuan/k-server/transformers/autoCompress';

const server = new KServer({
  responseTransformers: [new AutoCompressTransformer()],
  sender: restSender, // 设置响应发送器为 `restSender`（将以 REST 格式发送响应）
});

server.routers.main.addRouter(
  // 添加一个新的路由器
  new Router({
    matcher: 'test', // 自动匹配 /test 路径
    name: 'test', // 路由器名称
    onRootMatch: async (status) => {
      status.ctx.data = 'hello world'; // 向上下文添加数据
      await status.next(); // 调用下一个钩子
    },
  })
);

server.routers.main.addRouter(
  // 添加另一个路由
  new Router({
    matcher: 'notfound', // 自动匹配 /notfound 路径
    name: 'notfound', // 路由器名称
    onRootMatch: async (status) => {
      status.ctx.statue = Statue.NOT_FOUND; // 设置状态为 404
      await status.next(); // 调用下一个钩子
    },
  })
);

server.routers.main.addRouter(
  // 添加第三个路由
  new Router({
    matcher: 'error', // 自动匹配 /error 路径
    name: 'error', // 路由器名称
    onRootMatch: async () => {
      throw new Error('I am a error'); // 发送器会以 500 内部服务器错误响应
    },
  })
);

server.logApplication.addRecorder(
  // 向应用添加一个新的日志记录器。ConsoleRecorder 是内置的记录器，会将日志输出到控制台。
  new logControl.ConsoleRecorder({
    startLevel: logControl.Level.All, // 控制记录器的日志级别，输出所有日志
  })
);

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000'); // 启动服务器
});
```

## 脚本

- `pnpm run build` — 使用 esbuild 和 TypeScript 构建项目
- `pnpm run lint` — 对源文件运行 ESLint
- `pnpm run lint:fix` — 运行 ESLint 并自动修复问题
- `pnpm run test` — 构建并启动测试服务器（会持续运行，按 `Ctrl+C` 停止）
- `pnpm run format` — 使用 Prettier 格式化代码
- `pnpm run type-check` — 运行 TypeScript 类型检查（包含测试）
- `pnpm run type-build` — 生成类型声明

## 许可证

本项目采用 Mozilla Public License 2.0 许可。详情请参阅 [LICENSE](LICENSE)。
