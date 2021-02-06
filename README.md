# ts-transform-esm-import

---

## Work in progress.

---

[![Build Status](https://github.com/mgenware/ts-transform-esm-import/workflows/Build/badge.svg)](https://github.com/mgenware/ts-transform-esm-import/actions)
[![npm version](https://img.shields.io/npm/v/ts-transform-esm-import.svg?style=flat-square)](https://npmjs.com/package/ts-transform-esm-import)
[![Node.js Version](http://img.shields.io/node/v/ts-transform-esm-import.svg?style=flat-square)](https://nodejs.org/en/)

Rewrite TypeScript import paths to ES Modules import paths. A fork of [ts-transform-import-path-rewrite](https://github.com/dropbox/ts-transform-import-path-rewrite).

Without ts-transform-esm-import:

```ts
// Modules in `node_modules`.
import 'npmModule';
import 'npmModule/lib';

// Modules in `tsconfig.baseUrl`.
import 'subDir/file';
import 'rootFile';

// Relative paths.
import './rootFile';
import './subDir/file';
```

With ts-transform-esm-import, the code above compiles to ES modules friendly code:

```ts
// Modules in `node_modules`.
import '../node_modules/npmModule/dist/main.js';
import '../node_modules/npmModule/lib.js';

// Modules in `tsconfig.baseUrl`.
import './subDir/file.js';
import './rootFile.js';

// Relative paths.
import './rootFile.js';
import './subDir/file.js';
```

## Usage

See the [example project](https://github.com/mgenware/ts-transform-esm-import/tree/main/example).

- Install `typescript` and [ttypescript](https://github.com/cevek/ttypescript) for custom transformations.
- Create a `tsconfig.json` and use this transform as a plugin.
- Build project using `ttsc` instead of `tsc`.

An example `package.json`

```json
{
  "compilerOptions": {
    "declaration": true,
    "newLine": "lf",
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./dist",
    "baseUrl": "src",
    "rootDir": "./src",
    "plugins": [
      {
        "transform": "ts-transform-esm-import",
        "after": true,
        "afterDeclarations": true,
        "type": "config",
        "nodeModulesDir": "./node_modules",
        "baseDir": "./dist"
      }
    ]
  }
}
```

Options:

- `baseDir` source files root directory, used for `baseUrl` rewriting.
- `nodeModulesDir` `node_modules` directory, used for `node_modules` rewriting.
- `after`, `afterDeclarations`, `type` see [ttypescript](https://github.com/cevek/ttypescript).
