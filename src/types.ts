import type { IncomingMessage, ServerResponse as SR } from 'http';
import { Statue } from './globalCodes.js';
import { Duplex } from 'stream';
export type ServerRequest<Global> = IncomingMessage & {
  ourl: URL;
  kjson: () => Promise<unknown>;
  body: () => Promise<Uint8Array>;
  global: Global;
};
export type ServerResponse<Global> = SR & {
  needCompress?: boolean;
  global: Global;
};
export type UnpackPromise<T> = T extends Promise<infer R> ? R : T;
export type ServerResponseCtx = {
  data: unknown;
  statue: Statue;
};
export type Transformer<Global> = {
  transformer: (req: ServerRequest<Global>, res: ServerResponse<Global>) => Duplex | void;
  name: string;
  level: number;
};
declare module 'stream' {
  function compose(...streams: Duplex[]): Duplex;
}
