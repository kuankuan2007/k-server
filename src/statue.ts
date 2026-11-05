import { ResponseSenderInterface } from './types.js';
import { StreamSender } from './sender.js';

export class Statue {
  readonly code: number;
  readonly msg: string;
  readonly ok: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly specialSender?: ResponseSenderInterface<any>;
  constructor(
    code: number = 200,
    msg: string = '',
    ok: boolean = true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    specialSender?: ResponseSenderInterface<any>
  ) {
    this.code = code;
    this.msg = msg;
    this.ok = ok;
    this.specialSender = specialSender;
  }
  static readonly SENDED = new Statue(-1, 'sended', false, { send: () => {} });
  static readonly RAW_STREAM = new Statue(-2, 'raw stream', false, new StreamSender());
}

export class HTTPStatue extends Statue {
  static readonly CONTINUE = new HTTPStatue(100, 'continue', true);
  static readonly SWITCHING_PROTOCOLS = new HTTPStatue(101, 'switching protocols', true);
  static readonly PROCESSING = new HTTPStatue(102, 'processing', true);
  static readonly EARLY_HINTS = new HTTPStatue(103, 'early hints', true);

  static readonly OK = new HTTPStatue(200, 'ok', true);
  static readonly CREATED = new HTTPStatue(201, 'created', true);
  static readonly ACCEPTED = new HTTPStatue(202, 'accepted', true);
  static readonly NON_AUTHORITATIVE_INFORMATION = new HTTPStatue(
    203,
    'non-authoritative information',
    true
  );
  static readonly NO_CONTENT = new HTTPStatue(204, 'no content', true);
  static readonly RESET_CONTENT = new HTTPStatue(205, 'reset content', true);
  static readonly PARTIAL_CONTENT = new HTTPStatue(206, 'partial content', true);
  static readonly MULTI_STATUS = new HTTPStatue(207, 'multi status', true);
  static readonly ALREADY_REPORTED = new HTTPStatue(208, 'already reported', true);
  static readonly IM_USED = new HTTPStatue(226, 'im used', true);

  static readonly MULTIPLE_CHOICES = new HTTPStatue(300, 'multiple choices', true);
  static readonly MOVED_PERMANENTLY = new HTTPStatue(301, 'moved permanently', true);
  static readonly FOUND = new HTTPStatue(302, 'found', true);
  static readonly SEE_OTHER = new HTTPStatue(303, 'see other', true);
  static readonly NOT_MODIFIED = new HTTPStatue(304, 'not modified', true);
  static readonly USE_PROXY = new HTTPStatue(305, 'use proxy', true);
  static readonly TEMPORARY_REDIRECT = new HTTPStatue(307, 'temporary redirect', true);
  static readonly PERMANENT_REDIRECT = new HTTPStatue(308, 'permanent redirect', true);

  static readonly BAD_REQUEST = new HTTPStatue(400, 'bad request', false);
  static readonly UNAUTHORIZED = new HTTPStatue(401, 'unauthorized', false);
  static readonly PAYMENT_REQUIRED = new HTTPStatue(402, 'payment required', false);
  static readonly FORBIDDEN = new HTTPStatue(403, 'forbidden', false);
  static readonly NOT_FOUND = new HTTPStatue(404, 'not found', false);
  static readonly METHOD_NOT_ALLOWED = new HTTPStatue(405, 'method not allowed', false);
  static readonly NOT_ACCEPTABLE = new HTTPStatue(406, 'not acceptable', false);
  static readonly PROXY_AUTHENTICATION_REQUIRED = new HTTPStatue(
    407,
    'proxy authentication required',
    false
  );
  static readonly REQUEST_TIMEOUT = new HTTPStatue(408, 'request timeout', false);
  static readonly CONFLICT = new HTTPStatue(409, 'conflict', false);
  static readonly GONE = new HTTPStatue(410, 'gone', false);
  static readonly LENGTH_REQUIRED = new HTTPStatue(411, 'length required', false);
  static readonly PRECONDITION_FAILED = new HTTPStatue(412, 'precondition failed', false);
  static readonly PAYLOAD_TOO_LARGE = new HTTPStatue(413, 'payload too large', false);
  static readonly URI_TOO_LONG = new HTTPStatue(414, 'uri too long', false);
  static readonly UNSUPPORTED_MEDIA_TYPE = new HTTPStatue(415, 'unsupported media type', false);
  static readonly RANGE_NOT_SATISFIABLE = new HTTPStatue(416, 'range not satisfiable', false);
  static readonly EXPECTATION_FAILED = new HTTPStatue(417, 'expectation failed', false);
  static readonly IM_A_TEAPOT = new HTTPStatue(418, 'im a teapot', false);
  static readonly MISDIRECTED_REQUEST = new HTTPStatue(421, 'misdirected request', false);
  static readonly UNPROCESSABLE_ENTITY = new HTTPStatue(422, 'unprocessable entity', false);
  static readonly LOCKED = new HTTPStatue(423, 'locked', false);
  static readonly FAILED_DEPENDENCY = new HTTPStatue(424, 'failed dependency', false);
  static readonly TOO_EARLY = new HTTPStatue(425, 'too early', false);
  static readonly UPGRADE_REQUIRED = new HTTPStatue(426, 'upgrade required', false);
  static readonly PRECONDITION_REQUIRED = new HTTPStatue(428, 'precondition required', false);
  static readonly TOO_MANY_REQUESTS = new HTTPStatue(429, 'too many requests', false);
  static readonly REQUEST_HEADER_FIELDS_TOO_LARGE = new HTTPStatue(
    431,
    'request header fields too large',
    false
  );
  static readonly UNAVAILABLE_FOR_LEGAL_REASONS = new HTTPStatue(
    451,
    'unavailable for legal reasons',
    false
  );

  static readonly INTERNAL_SERVER_ERROR = new HTTPStatue(500, 'internal server error', false);
  static readonly NOT_IMPLEMENTED = new HTTPStatue(501, 'not implemented', false);
  static readonly BAD_GATEWAY = new HTTPStatue(502, 'bad gateway', false);
  static readonly SERVICE_UNAVAILABLE = new HTTPStatue(503, 'service unavailable', false);
  static readonly GATEWAY_TIMEOUT = new HTTPStatue(504, 'gateway timeout', false);
  static readonly HTTP_VERSION_NOT_SUPPORTED = new HTTPStatue(
    505,
    'http version not supported',
    false
  );
  static readonly VARIANT_ALSO_NEGOTIATES = new HTTPStatue(506, 'variant also negotiates', false);
  static readonly INSUFFICIENT_STORAGE = new HTTPStatue(507, 'insufficient storage', false);
  static readonly LOOP_DETECTED = new HTTPStatue(508, 'loop detected', false);
  static readonly NOT_EXTENDED = new HTTPStatue(510, 'not extended', false);
  static readonly NETWORK_AUTHENTICATION_REQUIRED = new HTTPStatue(
    511,
    'network authentication required',
    false
  );
}

export default HTTPStatue;
