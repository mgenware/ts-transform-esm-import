import { dummy } from './foo';
import 'fs';
import './lib/lib';
console.log(dummy);

export function foo(fn) {
  return import('node-a');
}

export { dummy2 } from './foo';
export { lib1 } from 'node-b/file';

import 'lib/lib';
import { dummy } from 'foo';
import 'foo';
