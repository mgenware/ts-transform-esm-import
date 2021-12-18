# ts-transform-esm-import

[![Build Status](https://github.com/mgenware/ts-transform-esm-import/workflows/Build/badge.svg)](https://github.com/mgenware/ts-transform-esm-import/actions)
[![npm version](https://img.shields.io/npm/v/ts-transform-esm-import.svg?style=flat-square)](https://npmjs.com/package/ts-transform-esm-import)

Rewrite TypeScript import paths to ES Modules import paths. **TypeScript 4.5+**!. A fork of [ts-transform-import-path-rewrite](https://github.com/dropbox/ts-transform-import-path-rewrite).

## Features

| Feature                 | Status | Note                                                     |
| ----------------------- | ------ | -------------------------------------------------------- |
| Add `.js` extension     | ✅     |                                                          |
| Resolving `baseUrl`     | ✅     |                                                          |
| CommonJS `main`         | ✅     |                                                          |
| CommonJS subpath        | ✅     |                                                          |
| CommonJS `module`       | ✅     |                                                          |
| ESM single string entry | ✅     |                                                          |
| ESM Subpath imports     | ✅     | https://nodejs.org/api/packages.html#subpath-imports     |
| ESM Subpath patterns    | ❌     | https://nodejs.org/api/packages.html#subpath-patterns    |
| ESM Conditional exports | ❌     | https://nodejs.org/api/packages.html#conditional-exports |

Before:

```ts
// Files in `node_modules`.
import 'npmModule';
import 'npmModule/lib';

// Files resolved by `tsconfig.baseUrl`.
import 'subDir/file';
import 'rootFile';

// Relative paths.
import './rootFile';
import './subDir/file';
```

After:

```ts
// Files in `node_modules`.
import '../node_modules/npmModule/dist/main.js';
import '../node_modules/npmModule/lib.js';

// Files resolved by `tsconfig.baseUrl`.
import './subDir/file.js';
import './rootFile.js';

// Relative paths.
import './rootFile.js';
import './subDir/file.js';
```

## Usage

> See [example](https://github.com/mgenware/ts-transform-esm-import/tree/main/example) for a runnable project.

- Install [ts-patch](https://github.com/nonara/ts-patch) and follow its instructions.
- Use this project as a plugin of ts-patch.

An example `tsconfig.json`

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

        "rootDir": "./src",
        "outDir": "./dist/src",
        "resolvers": [{ "dir": "./src", "sourceDir": true }, { "dir": "./node_modules" }]
      }
    ]
  }
}
```

### Options

- `rootDir` source files root directory, should be the `rootDir` in `tsconfig.json`.
- `outDir` output directory, should be the `outDir` in `tsconfig.json`.
- `resolvers` a list of resolvers to resolve absolute import paths.
  - `dir` search location for absolute import paths.
  - `sourceDir`: `boolean` whether search location is in root dir.
- `after`, `afterDeclarations`, `type` see [ts-patch Options](https://github.com/nonara/ts-patch).

### Resolver examples

To resolve paths in `node_modules`:

```json
{
  "rootDir": "./src",
  "outDir": "./dist/src",
  "resolvers": [{ "dir": "./node_modules" }]
}
```

To resolve something similar to TypeScript `baseUrl` (NOTE: `sourceDir` has to be true as resolver needs to travel inside source directory):

```json
{
  "rootDir": "./src",
  "outDir": "./dist/src",
  "resolvers": [{ "dir": "./src", "sourceDir": true }]
}
```

To resolve both `baseUrl` and `node_modules` (with `baseUrl` first):

```json
{
  "rootDir": "./src",
  "outDir": "./dist/src",
  "resolvers": [{ "dir": "./src", "sourceDir": true }, { "dir": "./node_modules" }]
}
```

## FAQ

### Import paths not rewritten

Make sure your `module` field in `tsconfig.json` is not `commonjs`, `esnext` is recommended.
