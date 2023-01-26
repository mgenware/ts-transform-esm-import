# ts-transform-esm-import

[![Build Status](https://github.com/mgenware/ts-transform-esm-import/workflows/Build/badge.svg)](https://github.com/mgenware/ts-transform-esm-import/actions)
[![npm version](https://img.shields.io/npm/v/ts-transform-esm-import.svg?style=flat-square)](https://npmjs.com/package/ts-transform-esm-import)

Rewrite TypeScript import paths to ES Modules import paths. **TypeScript 4.9+**!. A fork of [ts-transform-import-path-rewrite](https://github.com/dropbox/ts-transform-import-path-rewrite).

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
        "outDir": "./dist",
        "resolvers": [{ "dir": "./src", "sourceDir": true }, { "dir": "./node_modules" }]
      }
    ]
  }
}
```

### Options

- `rootDir` source files root directory, should be the `rootDir` in `tsconfig.json`.
- `outDir` output directory, should be the `outDir` in `tsconfig.json`.
- `after`, `afterDeclarations`, `type` see [ts-patch Options](https://github.com/nonara/ts-patch).
- `resolvers` a list of resolvers that define how imports are transformed.
  - `dir`: `string` search location for imports.
  - (Optional) `sourceDir`: `boolean` whether search location contains source files (ts files).
  - (Optional) `filter`: `string` regex string, run resolver only when filter tests true
  - (Optional) `mode`: `string` overrides default resolving mode, possible values:
    - `addExt` only adds extensions to imports.

### Resolver examples

To transform imports in `node_modules`:

```json
{
  "rootDir": "./src",
  "outDir": "./dist",
  "resolvers": [{ "dir": "./node_modules" }]
}
```

To transform imports using TypeScript `baseUrl`, set `sourceDir` to `true`, which indicates that we are travelling inside the source directory:

```json
{
  "rootDir": "./src",
  "outDir": "./dist",
  "resolvers": [{ "dir": "./src", "sourceDir": true }]
}
```

To apply a resolver only on a subset of imports, use the `filter` field (a regex value). For example, to rewrite imports starting with `@myOrg/`:

```json
{
  "rootDir": "./src",
  "outDir": "./dist",
  "resolvers": [{ "dir": "./node_modules", "filter": "^@myOrg/" }]
}
```

Sometimes the default resolving mode might confuse you. You can override it via the `mode` field. Currently, only one option (`addExt`) is supported, which simply adds a `.js` extension if needed.

```json
{
  "rootDir": "./src",
  "outDir": "./dist",
  "resolvers": [{ "dir": "./node_modules", "mode": "addExt" }]
}
```

You can combine multiple resolvers. For example, to do the following things altogether:

- Add missing `.js` extensions to all imports starting with `@myOrg/`
- Transform imports using TypeScript `baseUrl`
- Transform imports in `node_modules`

Use the following config:

```json
{
  "rootDir": "./src",
  "outDir": "./dist",
  "resolvers": [
    { "dir": "./node_modules", "filter": "^@myOrg/", "mode": "addExt" },
    { "dir": "./src", "sourceDir": true },
    { "dir": "./node_modules" }
  ]
}
```

## FAQ

### Import paths not rewritten

Make sure your `module` field in `tsconfig.json` is not `commonjs`, `esnext` is recommended.
