import { Duplex, PassThrough, compose } from 'node:stream';
import { ServerRequest, ServerResponse, Transformer } from './types.js';
function createResponseTransformer<Global=undefined>() {
  const transformers: Record<number, Transformer<Global>[]> = {};
  let transformersList: Transformer<Global>[] = [];
  function sortTransformers() {
    transformersList = [];
    const levels = Object.keys(transformers)
      .map((level) => Number(level))
      .sort()
      .reverse();
    for (const i of levels) {
      transformersList = transformersList.concat(transformers[i]);
    }
  }
  const responseTransformer = {
    use(transformer: Transformer<Global>) {
      if (!transformers[transformer.level]) {
        transformers[transformer.level] = [];
      }
      transformers[transformer.level].push(transformer);
      sortTransformers();
    },
    createTransformStream(req: ServerRequest<Global>, res: ServerResponse<Global>) {
      const streams: Duplex[] = [];
      for (const i of transformersList) {
        const result = i.transformer(req, res);
        if (result) {
          streams.push(result);
        }
      }
      if (streams.length) {
        return compose(...streams);
      }
      return new PassThrough();
    },
  } as const;
  return responseTransformer;
}

export default createResponseTransformer;
