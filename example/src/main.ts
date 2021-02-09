import format from 'bowhead-js';
import getHello from 'lib/getHello';

export default function foo(name: string): string {
  return format(`${getHello()} {0}`, name);
}

export * from 'lib/getHello';

window.document.getElementById('root')!.textContent = foo('world');
