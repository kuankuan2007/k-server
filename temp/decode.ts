import {
  createGunzip,
  createInflate,
  createBrotliDecompress,
  createZstdDecompress,
} from 'zlib';

import { ServerRequest } from '../src/types';
import { compose, Duplex } from 'stream';

const defaultEncodeings = Object.assign(Object.create(null), {
  gzip: () => createGunzip(),
  deflate: () => createInflate(),
  br: createBrotliDecompress,
  zstd: createZstdDecompress,
});
export function createDecompressor(contentEncoding: string[]) {
  if (!contentEncoding.length) {
    return void 0;
  }
  const decodeList = contentEncoding.toReversed();
  const decodeStream: Duplex[] = [];
  for (const e of decodeList) {
    const decoder = defaultEncodeings[e];
    if (decoder) {
      decodeStream.push(decoder());
    } else {
      throw new Error('unsupported encoding: ' + e);
    }
  }
  return compose(...decodeStream);
}

export function defaultAutoDecompress<Global = undefined>(
  req: ServerRequest<Global>
) {
  const contentEncoding = (req.headers['content-encoding'] || '')
    .split(',')
    .map((e) => e.trim())
    .filter((e) => e);
  try {
    return createDecompressor(contentEncoding);
  } catch (e) {
    req.logger.error(`Cannot decode content-encodings ${contentEncoding.join(', ')} with error: ${e}`);
    return void 0;
  }
}
