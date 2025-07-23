import { ResponseSender } from "./types";


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
  res.end(JSON.stringify(data));
};
export const restSender: ResponseSender<unknown> = (ctx, error, _req, res) => {
  if (error) {
    res.statusCode = 500;
    res.end('internal server error');
  } else {
    res.statusCode = ctx.statue.code;
    res.end(typeof ctx.data === 'string' ? ctx.data : JSON.stringify(ctx.data));
  }
};
