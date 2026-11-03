import { isTypedArray } from 'util/types';
import { ResponseSender } from './types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeableDataTransform(data: any) {
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

export const bodyOnlySender: ResponseSender<unknown> = (ctx, _req, res) => {
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
  res.end(body);
};
export const restSender: ResponseSender<unknown> = (ctx, _req, res) => {
  const statusCode = ctx.statue.code;
  const body = writeableDataTransform(ctx.data);
  res.statusCode = statusCode;
  res.end(body);
};
