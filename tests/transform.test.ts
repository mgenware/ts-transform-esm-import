/* eslint-disable import/extensions */
import * as path from 'path';
import * as assert from 'assert';
import { promises as fsPromises } from 'fs';
import compileInternal from './compile.js';
import { Opts as PathTransformOpts } from '../dist/main.js';

const nodeModuelsDir = './tests/nodeModulesDir';

function fixture(name: string): string {
  return path.join(path.resolve('./tests/fixture'), name);
}

async function readFile(file: string): Promise<string> {
  return fsPromises.readFile(file, 'utf8');
}

async function verifyFile(name: string, file: string, code: string, dtsCode: string) {
  const filePath = path.join(path.resolve('./tests/dist'), name, file);
  assert.strictEqual(await readFile(`${filePath}.js`), code);
  assert.strictEqual(await readFile(`${filePath}.d.ts`), dtsCode);
}

function compile(name: string, opts: PathTransformOpts) {
  const rootDir = fixture(`${name}`);
  const outDir = path.resolve(`./tests/dist/${name}`);
  compileInternal(rootDir, outDir, {
    ...opts,
    rootDir,
    outDir,
  });
}

it('Multiple resolvers', async () => {
  const name = 'all';
  compile(name, {
    resolvers: [{ dir: fixture(name), sourceDir: true }, { dir: nodeModuelsDir }],
    debug: true,
  });
  await verifyFile(
    name,
    'main',
    `import 'fs';
import '../../nodeModulesDir/node-a/foo/main.js';
import '../../nodeModulesDir/node-b/file.js';
import './sub';
import './sub.js';
import 'foo';
import '../foo';
import 'sub/sub';
import 'sub/sub.js';
`,
    `import 'fs';
import '../../nodeModulesDir/node-a/foo/main.js';
import '../../nodeModulesDir/node-b/file.js';
import './sub';
import './sub.js';
import 'foo';
import '../foo';
import 'sub/sub';
import 'sub/sub.js';
  `,
  );
});
