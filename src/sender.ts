import { isTypedArray } from 'util/types';
import {
  ResponseSenderInterface,
  ServerResponseCtx,
  ServerRequest,
  ServerResponse,
} from './types.js';
import { Readable } from 'stream';

export abstract class ResponseSenderBase<
  Global extends object | undefined = undefined,
> implements ResponseSenderInterface<Global> {
  abstract send(
    ctx: ServerResponseCtx,
    req: ServerRequest<Global>,
    res: ServerResponse<Global>
  ): void | Promise<void>;
}

export class RESTSender<
  Global extends object | undefined = undefined,
> extends ResponseSenderBase<Global> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected writeableDataTransform(data: any) {
    if (
      typeof data === 'string' ||
      Buffer.isBuffer(data) ||
      isTypedArray(data) ||
      data instanceof DataView
    ) {
      return data;
    }
    if (data === null || data === void 0) {
      return '';
    }
    return String(data);
  }
  override send(
    ctx: ServerResponseCtx,
    _req: ServerRequest<Global>,
    res: ServerResponse<Global>
  ): void | Promise<void> {
    return new Promise<void>((resolve) => {
      const statusCode = ctx.statue.code;
      const body = this.writeableDataTransform(ctx.data);
      res.statusCode = statusCode;
      res.end(body, () => resolve());
    });
  }
}

export class BodyOnlySender<
  Global extends object | undefined = undefined,
> extends ResponseSenderBase<Global> {
  override send(
    ctx: ServerResponseCtx,
    _req: ServerRequest<Global>,
    res: ServerResponse<Global>
  ): void | Promise<void> {
    return new Promise<void>((resolve) => {
      const data = {
        code: ctx.statue.code,
        msg: ctx.statue.msg,
        ok: ctx.statue.ok,
        data: ctx.data,
      };
      const body = JSON.stringify(data);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.statusCode = 200;
      res.end(body, () => resolve());
    });
  }
}

export class StreamSender<
  Global extends object | undefined = undefined,
> extends ResponseSenderBase<Global> {
  override send(
    ctx: ServerResponseCtx,
    _req: ServerRequest<Global>,
    res: ServerResponse<Global>
  ): void | Promise<void> {
    return new Promise<void>((resolve) => {
      (ctx.data as Readable).pipe(res);
      res.on('finish', () => resolve());
    });
  }
}
export class NoopSender<
  Global extends object | undefined = undefined,
> extends ResponseSenderBase<Global> {
  override send(): void | Promise<void> {
    return Promise.resolve();
  }
}