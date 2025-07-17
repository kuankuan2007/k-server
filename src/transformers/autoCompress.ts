import { createGzip, createDeflate, createBrotliCompress, createZstdCompress } from 'zlib';
import { Duplex } from 'stream';
import { ServerRequest, ServerResponse, Transformer } from '@/types';

const defaultEncodeings = Object.assign(Object.create(null), {
  gzip: () => createGzip({ level: 6 }),
  deflate: () => createDeflate({ level: 6 }),
  br: createBrotliCompress,
  zstd: createZstdCompress,
});

function createCompressor(encoding: string[]) {
  for (const e of encoding) {
    const compressor = defaultEncodeings[e];
    if (compressor) {
      return { transformStream: compressor(), encoding: e };
    }
  }
  return void 0;
}

type EncodingGenerator<Global=undefined> = (
  encoding: string[],
  req: ServerRequest<Global>,
  res: ServerResponse<Global>
) => { transformStream: Duplex; encoding: string } | void;

export default function getAutoCompress<Global = undefined>({
  level = -1,
  name = 'auto-compress',
  encodings = createCompressor,
}: { level?: number; name?: string; encodings?: EncodingGenerator<Global> } = {}): Transformer<Global> {
  return {
    name,
    level,
    transformer(req, res) {
      if (res.needCompress === false) {
        return void 0;
      }
      const acceptEncoding = (req.headers['accept-encoding'] || '')
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e);
      if (!acceptEncoding.length) {
        return void 0;
      }
      const result = encodings(acceptEncoding, req, res);
      if (!result) {
        return void 0;
      }
      const { transformStream, encoding } = result;
      res.setHeader('Content-Encoding', encoding);
      return transformStream;
    },
  };
}
