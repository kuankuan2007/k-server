// @ts-check
import esbuild from 'esbuild';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

async function dfsFiles(now) {
  if (!fs.existsSync(now)) {
    throw new Error(`${now} not exists`);
  }
  if ((await fs.promises.stat(now)).isDirectory()) {
    return fs.promises
      .readdir(now)
      .then((files) => Promise.all(files.map((file) => dfsFiles(path.resolve(now, file)))))
      .then((files) => files.flat());
  } else {
    return [now];
  }
}

(async () => {
  const rootPath = path.resolve(process.cwd());
  const outdir = path.resolve(rootPath, './dist');

  if (fs.existsSync(outdir)) {
    fs.rmSync(outdir, { recursive: true, force: true });
  }
  exec('tsc');
  const tsconfig = path.resolve(rootPath, './tsconfig.json');
  const files = await dfsFiles(path.resolve(rootPath, './src'));
  const entryPoints = files.filter((file) => file.endsWith('.ts'));
  await esbuild.build({
    entryPoints,
    tsconfig: tsconfig,
    outdir,
    bundle: true,
    platform: 'node',
    target: 'node21',
    format: 'esm',
    sourcemap: true,
    outExtension: { '.js': '.js' },
  });
})();
