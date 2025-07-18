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
  uuid: string;
  logger: Logger;
};
export type ServerResponse<Global = undefined> = SR & {
  needCompress?: boolean;
  global: Global;
  logger: Logger;
};
export type UnpackPromise<T> = T extends Promise<infer R> ? R : T;
export type ServerResponseCtx = {
  data: unknown;
  statue: Statue;
};
export type Transformer<Global = undefined> = {
  transformer: (req: ServerRequest<Global>, res: ServerResponse<Global>) => Duplex | void;
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
