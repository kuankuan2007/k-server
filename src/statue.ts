import { Readable } from 'stream';
import { ResponseSender } from './types';

export class Statue {
  readonly code: number;
  readonly msg: string;
  readonly ok: boolean;
  readonly specialSender?: ResponseSender<unknown>;
  constructor(
    code: number = 200,
    msg: string = '',
    ok: boolean = true,
    specialSender?: ResponseSender<unknown>
  ) {
    this.code = code;
    this.msg = msg;
    this.ok = ok;
    this.specialSender = specialSender;
  }
  static readonly CONTINUE = new Statue(100, 'continue', true);
  static readonly SWITCHING_PROTOCOLS = new Statue(101, 'switching protocols', true);
  static readonly PROCESSING = new Statue(102, 'processing', true);
  static readonly EARLY_HINTS = new Statue(103, 'early hints', true);

  static readonly OK = new Statue(200, 'ok', true);
  static readonly CREATED = new Statue(201, 'created', true);
  static readonly ACCEPTED = new Statue(202, 'accepted', true);
  static readonly NON_AUTHORITATIVE_INFORMATION = new Statue(
    203,
    'non-authoritative information',
    true
  );
  static readonly NO_CONTENT = new Statue(204, 'no content', true);
  static readonly RESET_CONTENT = new Statue(205, 'reset content', true);
  static readonly PARTIAL_CONTENT = new Statue(206, 'partial content', true);
  static readonly MULTI_STATUS = new Statue(207, 'multi status', true);
  static readonly ALREADY_REPORTED = new Statue(208, 'already reported', true);
  static readonly IM_USED = new Statue(226, 'im used', true);

  static readonly MULTIPLE_CHOICES = new Statue(300, 'multiple choices', true);
  static readonly MOVED_PERMANENTLY = new Statue(301, 'moved permanently', true);
  static readonly FOUND = new Statue(302, 'found', true);
  static readonly SEE_OTHER = new Statue(303, 'see other', true);
  static readonly NOT_MODIFIED = new Statue(304, 'not modified', true);
  static readonly USE_PROXY = new Statue(305, 'use proxy', true);
  static readonly TEMPORARY_REDIRECT = new Statue(307, 'temporary redirect', true);
  static readonly PERMANENT_REDIRECT = new Statue(308, 'permanent redirect', true);

  static readonly BAD_REQUEST = new Statue(400, 'bad request', false);
  static readonly UNAUTHORIZED = new Statue(401, 'unauthorized', false);
  static readonly PAYMENT_REQUIRED = new Statue(402, 'payment required', false);
  static readonly FORBIDDEN = new Statue(403, 'forbidden', false);
  static readonly NOT_FOUND = new Statue(404, 'not found', false);
  static readonly METHOD_NOT_ALLOWED = new Statue(405, 'method not allowed', false);
  static readonly NOT_ACCEPTABLE = new Statue(406, 'not acceptable', false);
  static readonly PROXY_AUTHENTICATION_REQUIRED = new Statue(
    407,
    'proxy authentication required',
    false
  );
  static readonly REQUEST_TIMEOUT = new Statue(408, 'request timeout', false);
  static readonly CONFLICT = new Statue(409, 'conflict', false);
  static readonly GONE = new Statue(410, 'gone', false);
  static readonly LENGTH_REQUIRED = new Statue(411, 'length required', false);
  static readonly PRECONDITION_FAILED = new Statue(412, 'precondition failed', false);
  static readonly PAYLOAD_TOO_LARGE = new Statue(413, 'payload too large', false);
  static readonly URI_TOO_LONG = new Statue(414, 'uri too long', false);
  static readonly UNSUPPORTED_MEDIA_TYPE = new Statue(415, 'unsupported media type', false);
  static readonly RANGE_NOT_SATISFIABLE = new Statue(416, 'range not satisfiable', false);
  static readonly EXPECTATION_FAILED = new Statue(417, 'expectation failed', false);
  static readonly IM_A_TEAPOT = new Statue(418, 'im a teapot', false);
  static readonly MISDIRECTED_REQUEST = new Statue(421, 'misdirected request', false);
  static readonly UNPROCESSABLE_ENTITY = new Statue(422, 'unprocessable entity', false);
  static readonly LOCKED = new Statue(423, 'locked', false);
  static readonly FAILED_DEPENDENCY = new Statue(424, 'failed dependency', false);
  static readonly TOO_EARLY = new Statue(425, 'too early', false);
  static readonly UPGRADE_REQUIRED = new Statue(426, 'upgrade required', false);
  static readonly PRECONDITION_REQUIRED = new Statue(428, 'precondition required', false);
  static readonly TOO_MANY_REQUESTS = new Statue(429, 'too many requests', false);
  static readonly REQUEST_HEADER_FIELDS_TOO_LARGE = new Statue(
    431,
    'request header fields too large',
    false
  );
  static readonly UNAVAILABLE_FOR_LEGAL_REASONS = new Statue(
    451,
    'unavailable for legal reasons',
    false
  );

  static readonly INTERNAL_SERVER_ERROR = new Statue(500, 'internal server error', false);
  static readonly NOT_IMPLEMENTED = new Statue(501, 'not implemented', false);
  static readonly BAD_GATEWAY = new Statue(502, 'bad gateway', false);
  static readonly SERVICE_UNAVAILABLE = new Statue(503, 'service unavailable', false);
  static readonly GATEWAY_TIMEOUT = new Statue(504, 'gateway timeout', false);
  static readonly HTTP_VERSION_NOT_SUPPORTED = new Statue(505, 'http version not supported', false);
  static readonly VARIANT_ALSO_NEGOTIATES = new Statue(506, 'variant also negotiates', false);
  static readonly INSUFFICIENT_STORAGE = new Statue(507, 'insufficient storage', false);
  static readonly LOOP_DETECTED = new Statue(508, 'loop detected', false);
  static readonly NOT_EXTENDED = new Statue(510, 'not extended', false);
  static readonly NETWORK_AUTHENTICATION_REQUIRED = new Statue(
    511,
    'network authentication required',
    false
  );

  static readonly SENDED = new Statue(-1, 'sended', false, () => {});
  static readonly RAW_STREAM = new Statue(-2, 'raw stream', false, (ctx, _error, _req, res) => {
    (ctx.data as Readable).pipe(res);
  });
}

export default Statue;
