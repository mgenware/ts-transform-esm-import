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

it('Resolve baseDir', async () => {
  const name = 'baseDir';
  compile(name, {
    resolvers: [{ dir: fixture(name), sourceDir: true }],
  });
  await verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('node-a');
}
export { dummy2 } from './foo.js';
export { lib1 } from 'node-b/file';
import './lib/lib.js';
import './foo.js';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from 'node-b/file';
import './lib/lib.js';
import './foo.js';
`,
  );
  await verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import 'node-a';
import 'node-b/file';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
    `import 'fs';
import 'node-a';
import 'node-b/file';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
  );
});

it('Resolve node_modules', async () => {
  const name = 'nodeModules';
  compile(name, {
    resolvers: [{ dir: nodeModuelsDir }],
  });
  await verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('../../nodeModulesDir/node-a/foo/main.js');
}
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/node-b/file.js';
import 'lib/lib';
import 'foo';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/node-b/file.js';
import 'lib/lib';
import 'foo';
`,
  );
  await verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import '../../../nodeModulesDir/node-a/foo/main.js';
import '../../../nodeModulesDir/node-b/file.js';
import './sub.js';
import 'foo';
import '../foo.js';
import 'lib/sub';
`,
    `import 'fs';
import '../../../nodeModulesDir/node-a/foo/main.js';
import '../../../nodeModulesDir/node-b/file.js';
import './sub.js';
import 'foo';
import '../foo.js';
import 'lib/sub';
`,
  );
});

it('Multiple resolvers', async () => {
  const name = 'all';
  compile(name, {
    resolvers: [{ dir: fixture(name), sourceDir: true }, { dir: nodeModuelsDir }],
  });
  await verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('../../nodeModulesDir/node-a/foo/main.js');
}
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/node-b/file.js';
import './lib/lib.js';
import './foo.js';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/node-b/file.js';
import './lib/lib.js';
import './foo.js';
`,
  );
  await verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import '../../../nodeModulesDir/node-a/foo/main.js';
import '../../../nodeModulesDir/node-b/file.js';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
    `import 'fs';
import '../../../nodeModulesDir/node-a/foo/main.js';
import '../../../nodeModulesDir/node-b/file.js';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
  );
});
