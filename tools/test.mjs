// @ts-check
import esbuild from 'esbuild';
import path from 'path';

const rootPath = path.resolve(process.cwd());

(async () => {
  const tsconfig = path.resolve(rootPath, './tsconfig.json');
  await esbuild.build({
    entryPoints: [path.resolve(rootPath, './test/src/test.ts')],
    tsconfig: tsconfig,
    outdir: path.resolve(rootPath, './test/dist'),
    bundle: true,
    platform: 'node',
    target: 'node21',
    format: 'esm',
    sourcemap: true,
    outExtension: { '.js': '.js' },
  });
  await import('../test/dist/test.js');
})();
