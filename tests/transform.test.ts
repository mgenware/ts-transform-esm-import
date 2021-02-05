/* eslint-disable import/extensions */
import { resolve, join } from 'path';
import * as assert from 'assert';
import { promises as fsPromises } from 'fs';
import compile from './compile';
import { Opts as PathTransformOpts } from '../dist/main.js';

async function t(name: string, opt: PathTransformOpts, output: string, defsOutput: string) {
  compile(resolve(__dirname, `fixture/${name}.ts`), opt);
  const outFile = resolve(__dirname, `fixture/${name}.js`);
  const defsOutFile = resolve(__dirname, `fixture/${name}.d.ts`);
  assert.strictEqual(await fsPromises.readFile(outFile, 'utf8'), output);
  assert.strictEqual(await fsPromises.readFile(defsOutFile, 'utf8'), defsOutput);
}

it('Default mode (add extensions to relative imports)', async () => {
  await t(
    'doNothing',
    {},
    `import { dummy } from "./bar";
import "./sub/sub.js";
console.log(dummy);
export function foo(fn) {
    return import("node-a");
}
export { dummy2 } from "./bar";
export { lib1 } from "node-b/subdir";
export { lib2 } from "node-b/subdir.js";
import "sub/sub";
import "sub/sub.js";
`,
    `import "./sub/sub.js";
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from "./bar";
export { lib1 } from "node-b/subdir";
export { lib2 } from "node-b/subdir.js";
import "sub/sub";
import "sub/sub.js";
`,
  );
});

it('Resolve baseUrl', async () => {
  await t(
    'baseDir',
    { baseDir: join(__dirname, 'fixture') },
    `import { dummy } from "./bar";
import "./sub/sub.js";
console.log(dummy);
export function foo(fn) {
    return import("node-a");
}
export { dummy2 } from "./bar";
export { lib1 } from "node-b/file";
export { lib2 } from "node-b/file.js";
import "./sub/sub.js";
import "./sub/sub.js";
`,
    `import "./sub/sub.js";
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from "./bar";
export { lib1 } from "node-b/file";
export { lib2 } from "node-b/file.js";
import "./sub/sub.js";
import "./sub/sub.js";
`,
  );
});

it('Resolve node modules', async () => {
  await t(
    'nodeModules',
    {
      nodeModulesDir: join(__dirname, 'nodeModulesDir'),
      nodeModulesOutputDir: '../nodeModulesDir',
    },
    `import { dummy } from "./bar";
import "./sub/sub.js";
console.log(dummy);
export function foo(fn) {
    return import("../nodeModulesDir/node-a/foo/main.js");
}
export { dummy2 } from "./bar";
export { lib1 } from "../nodeModulesDir/node-b/file.js";
export { lib2 } from "../nodeModulesDir/node-b/file.js";
import "sub/sub";
import "sub/sub.js";
`,
    `import "./sub/sub.js";
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from "./bar";
export { lib1 } from "../nodeModulesDir/node-b/file.js";
export { lib2 } from "../nodeModulesDir/node-b/file.js";
import "sub/sub";
import "sub/sub.js";
`,
  );
});
