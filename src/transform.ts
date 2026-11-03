import { Duplex, PassThrough, compose } from 'node:stream';
import {
  ServerRequest,
  ServerResponse,
  Transformer,
  TransformStreamWrapper,
  TransformStreamPipelineWrapper,
} from './types.js';

export class TransformerPipeline<Global = undefined> {
  readonly transformers: Transformer<Global>[];
  constructor(transformers: Transformer<Global>[]) {
    this.transformers = transformers.toSorted((a, b) => b.level - a.level);
  }
  createTransformStream(req: ServerRequest<Global>, res: ServerResponse<Global>) {
    const streams: TransformStreamWrapper[] = [];
    for (const i of this.transformers) {
      const streamWrapper = i.transformer(req, res);
      streams.push(streamWrapper);
    }
    const streamFinal = streams.map((s) => s.stream).filter((s) => s !== void 0);
    const stream: Duplex = streamFinal.length ? compose(...streamFinal) : new PassThrough();
    return new TransformStreamPipelineWrapper(stream, function () {
      for (const s of streams) {
        try {
          s.cancel();
        } catch {
          // ignore
        }
      }
    });
  }
}
