export class Statue {
  readonly code: number;
  readonly msg: string;
  readonly ok: boolean;
  constructor(code: number = 200, msg: string = '', ok: boolean = true) {
    this.code = code;
    this.msg = msg;
    this.ok = ok;
  }
  static readonly NOT_FOUND = new Statue(404, 'not found', false);
  static readonly GONE = new Statue(410, 'gone', false);
  static readonly NO_LOGIN = new Statue(10000, 'no login', false);
  static readonly REFUSE = new Statue(10001, 'refuse', false);
  static readonly VALUE_ERROR = new Statue(10002, 'value error', false);
  static readonly METHOD_NOT_ALLOWED = new Statue(10003, 'method not allowed', false);
  static readonly WRONG_ANSWER = new Statue(10004, 'wrong answer', false);
  static readonly SERVER_ERROR = new Statue(10005, 'server error', false);
  static readonly INSUFFICIENT_AUTHORITY = new Statue(10006, 'insufficient authority', false);
  static readonly REFUSED = new Statue(10007, 'refused', false);
  static readonly CANCELED = new Statue(10008, 'canceled', false);
  static readonly TOO_OFTEN = new Statue(10009, 'too often', false);
  static readonly REQUIRES_LEADING_STEPS = new Statue(100010, 'required leading steps', false);
  static readonly SENDED = new Statue(-1, 'sended', false);
}

export const {
  NOT_FOUND,
  GONE,
  NO_LOGIN,
  REFUSE,
  VALUE_ERROR,
  METHOD_NOT_ALLOWED,
  WRONG_ANSWER,
  SERVER_ERROR,
  INSUFFICIENT_AUTHORITY,
  REFUSED,
  CANCELED,
  TOO_OFTEN,
  REQUIRES_LEADING_STEPS,
  SENDED,
} = Statue;