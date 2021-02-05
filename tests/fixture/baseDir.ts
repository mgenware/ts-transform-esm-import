import { dummy } from "./bar";
import "./sub/sub.js";
console.log(dummy);

export function foo(fn) {
  return import("node-a");
}

export { dummy2 } from "./bar";
export { lib1 } from "node-b/file";
export { lib2 } from "node-b/file.js";

import "sub/sub";
import "sub/sub.js";
import { dummy } from "bar";
