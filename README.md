# @kuankuan/k-server

A simple and easy-to-use server framework for Node.js.

## Features

- Lightweight and modular design
- Router-based request handling
- Built-in logging with [@kuankuan/log-control](https://www.npmjs.com/package/@kuankuan/log-control)
- Automatic response compression
- TypeScript support
- Easy to extend and customize

## Installation

```sh
npm install @kuankuan/k-server
```

## Usage

```ts
import { createServer, Router, restSender, Statue } from '@kuankuan/k-server';
import logControl from '@kuankuan/log-control';

const serverInstance = createServer({
  sender: restSender, // Set the response sender to `restSender` (it will send the response in REST format)
});

serverInstance.routers.main.addRouter(
  // Add a new router
  new Router({
    matcher: 'test', // Auto match the /test path
    name: 'main', // The router name
    onRootMatch: async (req, res, ctx, next) => {
      ctx.data = 'hello world'; // Add data to the context
      await next(); // Call next hook
    },
  })
);

serverInstance.routers.main.addRouter(
  // Add another route
  new Router({
    matcher: 'notfound', // Auto match the /notfound path
    name: 'notfound', // The router name
    onRootMatch: async (req, res, ctx, next) => {
      ctx.statue = Statue.NOT_FOUND; // Set the statue to 404
      await next(); // Call next hook
    },
  })
);

serverInstance.routers.main.addRouter(
  // Add the third route
  new Router({
    matcher: 'error', // Auto match the /error path
    name: 'error', // The router name
    onRootMatch: async (req, res, ctx, next) => {
      throw new Error('I am a error'); // The sender will send a response as a 500 internal server error
    },
  })
);

serverInstance.logApplication.addRecorder(
  // Add a new recorder to the application. ConsoleRecorder is a built-in recorder that outputs logs to the console.
  new logControl.ConsoleRecorder({
    startLevel: logControl.Level.All, // Control the log level of the recorder to output all logs
  })
);

serverInstance.server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000'); // Start the server
});
```

## Scripts

- `npm run build` — Build the project using esbuild and TypeScript
- `npm run lint` — Run ESLint on the source files
- `npm run lint:fix` — Run ESLint and automatically fix issues
- `npm run test` — Build and run tests
- `npm run prettier` — Format code using Prettier

## License

This project is licensed under the Mozilla Public License 2.0. See [LICENSE](LICENSE) for details.
