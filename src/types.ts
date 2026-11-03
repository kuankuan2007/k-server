import type { IncomingMessage, ServerResponse as SR } from 'http';
import { Statue } from './statue.js';
import { Duplex } from 'stream';
import logControl, { Logger } from '@kuankuan/log-control';

export const logging = logControl;
export type Logging = typeof logControl;
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
export type ResponseSender<Global = undefined> = (
  ctx: ServerResponseCtx,
  req: ServerRequest<Global>,
  res: ServerResponse<Global>
) => void | Promise<void>;
