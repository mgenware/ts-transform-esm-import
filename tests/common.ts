import * as path from 'path';
import * as assert from 'assert';
import { promises as fsPromises } from 'fs';
import compileInternal from './compile.js';
import { Opts as PathTransformOpts } from '../dist/def.js';

export const nodeModulesDir = './tests/nodeModulesDir';

export function fixture(name: string): string {
  return path.join(path.resolve('./tests/fixture'), name);
}

export async function readFile(file: string): Promise<string> {
  return fsPromises.readFile(file, 'utf8');
}

export async function verifyFile(name: string, file: string, code: string, dtsCode: string) {
  const filePath = path.join(path.resolve('./tests/dist'), name, file);
  assert.strictEqual(await readFile(`${filePath}.js`), code);
  assert.strictEqual(await readFile(`${filePath}.d.ts`), dtsCode);
}

export function compile(name: string, opts: PathTransformOpts) {
  const rootDir = fixture(`${name}`);
  const outDir = path.resolve(`./tests/dist/${name}`);
  compileInternal(rootDir, outDir, {
    ...opts,
    rootDir,
    outDir,
  });
}
