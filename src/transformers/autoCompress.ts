import { createGzip, createDeflate, createBrotliCompress, createZstdCompress } from 'zlib';
import { Duplex } from 'stream';
import { ServerRequest, ServerResponse, Transformer } from '@/types.js';
import { TransformStreamWrapper } from '@/types.js';

type EncodingMap = Record<string, () => Duplex>;
const defaultEncodeings: EncodingMap = Object.freeze(
  Object.assign(Object.create(null), {
    gzip: () => createGzip({ level: 6 }),
    deflate: () => createDeflate({ level: 6 }),
    br: createBrotliCompress,
    zstd: createZstdCompress,
  })
);

export type EncodingGenerator<Global = undefined> = {
  generate: (
    encoding: string[],
    req: ServerRequest<Global>,
    res: ServerResponse<Global>
  ) => { transformStream: Duplex; encoding: string } | void;
};

export class DefaultEncodingGenerator<Global = undefined> implements EncodingGenerator<Global> {
  public readonly encodingMap: EncodingMap;
  constructor(encodingMap: EncodingMap = defaultEncodeings) {
    this.encodingMap = encodingMap;
  }
  generate(encoding: string[]) {
    for (const e of encoding) {
      const compressor = this.encodingMap[e];
      if (compressor) {
        return { transformStream: compressor(), encoding: e };
      }
    }
    return void 0;
  }
}

export class AutoCompressTransformer<Global = undefined> implements Transformer<Global> {
  public readonly level: number;
  public readonly name: string;
  public readonly encodings: EncodingGenerator<Global>;
  constructor(
    level: number = -1,
    name: string = 'auto-compress',
    encodings: EncodingGenerator<Global> = new DefaultEncodingGenerator()
  ) {
    this.level = level;
    this.name = name;
    this.encodings = encodings;
  }
  getEncodingStream(
    acceptEncoding: string[],
    req: ServerRequest<Global>,
    res: ServerResponse<Global>
  ) {
    return this.encodings.generate(acceptEncoding, req, res);
  }
  transformer(req: ServerRequest<Global>, res: ServerResponse<Global>): TransformStreamWrapper {
    if (res.needCompress === false) {
      return new TransformStreamWrapper(void 0, () => {});
    }
    const acceptEncoding = (req.headers['accept-encoding'] || '')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e);
    if (!acceptEncoding.length) {
      return new TransformStreamWrapper(void 0, () => {});
    }
    const result = this.getEncodingStream(acceptEncoding, req, res);
    if (!result) {
      return new TransformStreamWrapper(void 0, () => {});
    }
    const { transformStream, encoding } = result;
    res.setHeader('Content-Encoding', encoding);
    return new TransformStreamWrapper(transformStream, () => {
      if (!res.headersSent) {
        res.removeHeader('Content-Encoding');
      }
    });
  }
}
