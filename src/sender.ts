import { isTypedArray } from 'util/types';
import { ResponseSender } from './types';

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
  if (typeof data === 'object') {
    return JSON.stringify(data);
  }
  return String(data);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonDataTransform(data: any): unknown {
  if (
    typeof data === 'string' ||
    typeof data === 'number' ||
    typeof data === 'boolean' ||
    data === null ||
    data === void 0
  ) {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return { type: 'bytes', encoding: 'base64', data: data.toString('base64') };
  }
  if (isTypedArray(data)) {
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return { type: 'bytes', encoding: 'base64', data: buf.toString('base64') };
  }
  if (data instanceof DataView) {
    const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return { type: 'bytes', encoding: 'base64', data: buf.toString('base64') };
  }
  if (Array.isArray(data)) {
    return data.map(jsonDataTransform);
  }
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = jsonDataTransform(data[key]);
      }
    }
    return result;
  }
  return String(data);
}

export const bodyOnlySender: ResponseSender<unknown> = (ctx, error, _req, res) => {
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  const data = error
    ? {
        code: 500,
        msg: 'internal server error',
        ok: false,
      }
    : {
        code: ctx.statue.code,
        msg: ctx.statue.msg,
        ok: ctx.statue.ok,
        data: ctx.data,
      };
  res.statusCode = 200;
  res.end(JSON.stringify(jsonDataTransform(data)));
};
export const restSender: ResponseSender<unknown> = (ctx, error, _req, res) => {
  if (error) {
    res.statusCode = 500;
    res.end('internal server error');
  } else {
    res.statusCode = ctx.statue.code;
    res.end(writeableDataTransform(ctx.data));
  }
};
