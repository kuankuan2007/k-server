import { defineConfig, RolldownOptions, Plugin } from 'rolldown';
import fs from 'fs';
import path from 'node:path';
import { promisify } from 'node:util';
import child_process from 'node:child_process';

const exec = promisify(child_process.exec);
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), './package.json'), 'utf-8')
);

const banner = `/*!
 * @name k-server
 * @package @kuankuan/k-server
 * @license MulanPSL-2.0
 * @copyright (c) ${new Date().getFullYear()} kuankuan2007
 * @author KUANKUAN <2163826131@qq.com>
 * @source https://github.com/kuankuan2007/k-server
 * @build ${new Date().toISOString()}
 * @version ${packageJson.version}
 */`;

async function dfsFiles(now: string): Promise<string[]> {
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
async function buildInputOptions(suffix: string = '') {
  const files = await dfsFiles('src');
  const result: Record<string, string> = {};
  for (const file of files) {
    const relativePath = path.relative(path.resolve(process.cwd(), 'src'), file);
    const outputPath = `${relativePath.replace(/\.ts$/, '').replace(/\\/g, '/')}${suffix}`;
    result[outputPath] = file;
  }
  return result;
}

function copyDtsPlugin(): Plugin {
  return {
    name: 'copy-dts',
    async writeBundle() {
      console.log('[copy-dts] start make .d.ts files');
      const typesDir = path.resolve(process.cwd(), 'types');
      const copyFrom = path.resolve(typesDir, 'src');
      const distDir = path.resolve(process.cwd(), 'dist');

      if (fs.existsSync(typesDir)) {
        await fs.promises.rm(typesDir, { recursive: true, force: true });
      }
      await fs.promises.mkdir(typesDir, { recursive: true });

      await exec('npx tsc');
      console.log('[copy-dts] tsc done');

      if (!fs.existsSync(typesDir)) {
        console.warn('[copy-dts] types/src not found, please run tsc first');
        return;
      }
      async function copyDts(src: string, dest: string) {
        await fs.promises.mkdir(dest, { recursive: true });
        for (const entry of await fs.promises.readdir(src, { withFileTypes: true })) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            await copyDts(srcPath, destPath);
          } else if (entry.name.endsWith('.d.ts')) {
            await fs.promises.copyFile(srcPath, destPath);
          }
        }
      }
      await copyDts(copyFrom, distDir);
      console.log('[copy-dts] .d.ts files copied to dist/');
    },
  };
}

export default defineConfig([
  ...(await Promise.all(
    (['esm', 'cjs'] as const).map(async (i, index): Promise<RolldownOptions> => ({
      input: await buildInputOptions(),
      plugins: index === 0 ? [copyDtsPlugin()] : [],
      transform: {
        dropLabels: ['DEBUG'],
      },
      output: {
        dir: 'dist',
        sourcemap: true,
        format: i,
        cleanDir: index === 0,
        entryFileNames: i === 'esm' ? '[name].mjs' : '[name].cjs',
        banner: (info) => {
          const fileName = info.fileName;

          if (/index\.(mjs|cjs)$/.test(fileName)) {
            return banner;
          }
          return `/*!
 * @package @kuankuan/k-server
 * @copyright (c) ${new Date().getFullYear()} kuankuan2007
 * @file ${fileName}
 */`;
        },
      },
    }))
  )),
]);
