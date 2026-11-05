import type { IncomingMessage, ServerResponse as SR } from 'http';
import { Statue } from './statue.js';
import { Duplex } from 'stream';
import type http from 'http';
import type { Logger, Application } from '@kuankuan/log-control';

export type ServerRequest<Global = undefined> = IncomingMessage & {
  ourl: URL;
  body: () => Promise<Uint8Array>;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  global: Global;
  requestId: string;
  logger: Logger;
};
export type ServerResponse<Global = undefined> = SR & {
  needCompress?: boolean;
  isProxy?: boolean;
  global: Global;
  logger: Logger;
};
export type UnpackPromise<T> = T extends Promise<infer R> ? R : T;
export type ServerResponseCtx = {
  data: unknown;
  statue: Statue;
};
export class TransformStreamWrapper {
  readonly stream: Duplex | undefined;
  readonly cancel: () => void;
  constructor(stream: Duplex | undefined, cancel: () => void) {
    this.stream = stream;
    this.cancel = cancel;
  }
}
export class TransformStreamPipelineWrapper {
  readonly stream: Duplex;
  readonly cancel: () => void;
  constructor(stream: Duplex, cancel: () => void) {
    this.stream = stream;
    this.cancel = cancel;
  }
}
export type Transformer<Global = undefined> = {
  transformer: (req: ServerRequest<Global>, res: ServerResponse<Global>) => TransformStreamWrapper;
  name: string;
  level: number;
};
export type RequestDecompressor<Global = undefined> = (
  req: ServerRequest<Global>,
  res: ServerResponse<Global>
) => void | Duplex;

declare module 'stream' {
  function compose(...streams: Duplex[]): Duplex;
}

export type RequestIdGenerator<Global = undefined> = (
  req: ServerRequest<Global>,
  res: ServerResponse<Global>
) => string;

export type ResponseSenderInterface<Global extends object | undefined = undefined> = {
  send: (
    ctx: ServerResponseCtx,
    req: ServerRequest<Global>,
    res: ServerResponse<Global>
  ) => void | Promise<void>;
};

export enum RequestErrorStage {
  PREPARATION = 'PREPARATION',
  TRANSFORM_STREAM_CREATE = 'TRANSFORM_STREAM_CREATE',
  ROUTER_MATCH = 'ROUTER_MATCH',
  ROUTER_EXECUTE = 'ROUTER_EXECUTE',
  SEND = 'SEND',
  TRANSFORM_STREAM = 'TRANSFORM_STREAM',
  RESPONSE_STREAM = 'RESPONSE_STREAM',
}
export type GlobalSetter<Global extends object | undefined = undefined> = (
  req: ServerRequest<Global>,
  res: ServerResponse<Global>
) => Global;
export type RequestErrorHandler<Global extends object | undefined = undefined> = (
  err: unknown,
  stage: RequestErrorStage,
  req: ServerRequest<Global>,
  res: ServerResponse<Global>,
  rawRes: ServerResponse<Global>,
  ctx: ServerResponseCtx,
  sender: ResponseSenderInterface<Global>
) => void | Promise<void>;
export type ServerOptions<Global extends object | undefined = undefined> = {
  logApplication?: Application;
  setGlobal?: GlobalSetter<Global>;
  responseTransformers?: Transformer<Global>[];
  server?: http.Server;
  requestIdGenerator?: RequestIdGenerator<Global>;
  sender?: ResponseSenderInterface<Global>;
  errorHandler?: RequestErrorHandler<Global>;
};
