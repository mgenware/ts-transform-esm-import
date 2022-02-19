import { dummy } from './foo';
import 'fs';
import './lib/lib';
console.log(dummy);

export function foo(fn) {
  return import('exports');
}

export { dummy2 } from './foo';
export { lib1 } from 'singleFile/file';

import 'lib/lib';
import { dummy } from 'foo';
import 'foo';
