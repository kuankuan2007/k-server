export class Statue {
  readonly code: number;
  readonly msg: string;
  readonly ok: boolean;
  constructor(code: number = 200, msg: string = '', ok: boolean = true) {
    this.code = code;
    this.msg = msg;
    this.ok = ok;
  }
}
export const NOT_FOUND = new Statue(404, 'not found', false);
export const GONE = new Statue(410, 'gone', false);
export const NO_LOGIN = new Statue(10000, 'no login', false);
export const REFUSE = new Statue(10001, 'refuse', false);
export const VALUE_ERROR = new Statue(10002, 'value error', false);
export const METHOD_NOT_ALLOWED = new Statue(10003, 'method not allowed', false);
export const WRONG_ANSWER = new Statue(10004, 'wrong answer', false);
export const SERVER_ERROR = new Statue(10005, 'server error', false);
export const INSUFFICIENT_AUTHORITY = new Statue(10006, 'insufficient authority', false);
export const REFUSED = new Statue(10007, 'refused', false);
export const CANCELED = new Statue(10008, 'canceled', false);
export const TOO_OFTEN = new Statue(10009, 'too often', false);
export const REQUIRES_LEADING_STEPS = new Statue(100010, 'required leading steps', false);
export const SENDED = new Statue(-1, 'sended', false);
