# @kuankuan/k-server

A simple and easy-to-use server framework for Node.js.

## Features

- Lightweight and modular design
- Router-based request handling
- Built-in logging with [@kuankuan/log-control](https://www.npmjs.com/package/@kuankuan/log-control)
- Composable response transformers (automatic compression is opt-in)
- TypeScript support
- Easy to extend and customize

## Installation

```sh
npm install @kuankuan/k-server
```

## Usage

Response transformers are opt-in. Add `AutoCompressTransformer` to `responseTransformers` to enable automatic response compression.

```ts
import { KServer, Router, restSender, Statue } from '@kuankuan/k-server';
import logControl from '@kuankuan/log-control';
import { AutoCompressTransformer } from '@kuankuan/k-server/transformers/autoCompress';

const server = new KServer({
  responseTransformers: [new AutoCompressTransformer()],
  sender: restSender, // Set the response sender to `restSender` (it will send the response in REST format)
});

server.routers.main.addRouter(
  // Add a new router
  new Router({
    matcher: 'test', // Auto match the /test path
    name: 'test', // The router name
    onRootMatch: async (status) => {
      status.ctx.data = 'hello world'; // Add data to the context
      await status.next(); // Call next hook
    },
  })
);

server.routers.main.addRouter(
  // Add another route
  new Router({
    matcher: 'notfound', // Auto match the /notfound path
    name: 'notfound', // The router name
    onRootMatch: async (status) => {
      status.ctx.statue = Statue.NOT_FOUND; // Set the statue to 404
      await status.next(); // Call next hook
    },
  })
);

server.routers.main.addRouter(
  // Add the third route
  new Router({
    matcher: 'error', // Auto match the /error path
    name: 'error', // The router name
    onRootMatch: async () => {
      throw new Error('I am a error'); // The sender will send a response as a 500 internal server error
    },
  })
);

server.logApplication.addRecorder(
  // Add a new recorder to the application. ConsoleRecorder is a built-in recorder that outputs logs to the console.
  new logControl.ConsoleRecorder({
    startLevel: logControl.Level.All, // Control the log level of the recorder to output all logs
  })
);

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000'); // Start the server
});
```

## Scripts

- `pnpm run build` — Build the project using esbuild and TypeScript
- `pnpm run lint` — Run ESLint on the source files
- `pnpm run lint:fix` — Run ESLint and automatically fix issues
- `pnpm run test` — Build and start the test server (it keeps running; press `Ctrl+C` to stop)
- `pnpm run format` — Format code using Prettier
- `pnpm run type-check` — Run TypeScript type checking (including tests)
- `pnpm run type-build` — Generate type declarations

## License

This project is licensed under the Mozilla Public License 2.0. See [LICENSE](LICENSE) for details.
