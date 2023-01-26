import * as cm from './common.js';

it('Resolve baseUrl', async () => {
  const name = 'baseUrl';
  cm.compile(name, {
    resolvers: [{ dir: cm.fixture(name), sourceDir: true }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('exports');
}
export { dummy2 } from './foo.js';
export { lib1 } from 'singleFile/file';
import './lib/lib.js';
import './foo.js';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from 'singleFile/file';
import './lib/lib.js';
import './foo.js';
`,
  );
  await cm.verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import 'exports';
import 'singleFile/file';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
    `import 'fs';
import 'exports';
import 'singleFile/file';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
  );
});

it('Resolve node_modules', async () => {
  const name = 'nodeModules';
  cm.compile(name, {
    resolvers: [{ dir: cm.nodeModulesDir }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('../../nodeModulesDir/exports/foo/main.js');
}
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/singleFile/file.js';
import 'lib/lib';
import 'foo';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/singleFile/file.js';
import 'lib/lib';
import 'foo';
`,
  );
  await cm.verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import '../../../nodeModulesDir/exports/foo/main.js';
import '../../../nodeModulesDir/singleFile/file.js';
import './sub.js';
import 'foo';
import '../foo.js';
import 'lib/sub';
`,
    `import 'fs';
import '../../../nodeModulesDir/exports/foo/main.js';
import '../../../nodeModulesDir/singleFile/file.js';
import './sub.js';
import 'foo';
import '../foo.js';
import 'lib/sub';
`,
  );
});

it('Multiple resolvers', async () => {
  const name = 'all';
  cm.compile(name, {
    resolvers: [{ dir: cm.fixture(name), sourceDir: true }, { dir: cm.nodeModulesDir }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('../../nodeModulesDir/exports/foo/main.js');
}
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/singleFile/file.js';
import './lib/lib.js';
import './foo.js';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from '../../nodeModulesDir/singleFile/file.js';
import './lib/lib.js';
import './foo.js';
`,
  );
  await cm.verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import '../../../nodeModulesDir/exports/foo/main.js';
import '../../../nodeModulesDir/singleFile/file.js';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
    `import 'fs';
import '../../../nodeModulesDir/exports/foo/main.js';
import '../../../nodeModulesDir/singleFile/file.js';
import './sub.js';
import '../foo.js';
import '../foo.js';
import './sub.js';
`,
  );
});

it('Filter', async () => {
  const name = 'baseUrl';
  cm.compile(name, {
    resolvers: [{ dir: cm.fixture(name), sourceDir: true, filter: 'lib/lib' }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('exports');
}
export { dummy2 } from './foo.js';
export { lib1 } from 'singleFile/file';
import './lib/lib.js';
import 'foo';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from 'singleFile/file';
import './lib/lib.js';
import 'foo';
`,
  );
  await cm.verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import 'exports';
import 'singleFile/file';
import './sub.js';
import 'foo';
import '../foo.js';
import 'lib/sub';
`,
    `import 'fs';
import 'exports';
import 'singleFile/file';
import './sub.js';
import 'foo';
import '../foo.js';
import 'lib/sub';
`,
  );
});

it('Mode = addExt', async () => {
  const name = 'baseUrl';
  cm.compile(name, {
    resolvers: [{ dir: cm.fixture(name), sourceDir: true, mode: 'addExt', filter: '^foo' }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import 'fs';
import './lib/lib.js';
console.log(dummy);
export function foo(fn) {
    return import('exports');
}
export { dummy2 } from './foo.js';
export { lib1 } from 'singleFile/file';
import 'lib/lib';
import 'foo.js';
`,
    `import 'fs';
import './lib/lib.js';
export declare function foo(fn: any): Promise<any>;
export { dummy2 } from './foo.js';
export { lib1 } from 'singleFile/file';
import 'lib/lib';
import 'foo.js';
`,
  );
  await cm.verifyFile(
    name,
    'lib/lib',
    `import 'fs';
import 'exports';
import 'singleFile/file';
import './sub.js';
import 'foo.js';
import '../foo.js';
import 'lib/sub';
`,
    `import 'fs';
import 'exports';
import 'singleFile/file';
import './sub.js';
import 'foo.js';
import '../foo.js';
import 'lib/sub';
`,
  );
});

it('.js to .ts when `sourceDir` is true', async () => {
  const name = 'jsToTs';
  cm.compile(name, {
    resolvers: [{ dir: cm.fixture(name), sourceDir: true }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import { dummy } from './foo.js';
import { dummy2 } from './foo.js';
import 'fs';
import './lib/lib.js';
import './lib/lib.js';
console.log(dummy, dummy2);
`,
    `import 'fs';
import './lib/lib.js';
import './lib/lib.js';
`,
  );
});
