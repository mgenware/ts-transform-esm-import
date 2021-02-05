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
// Absolute paths: an npm module.
import 'npm';
import 'npm/lib';

// Absolute paths: make use of `tsconfig.json` `baseUrl`.
import 'subDir/file';
import 'rootFile';

// Relative paths.
import './rootFile';
import './subDir/file';
```

With ts-transform-esm-import, the code above compiles to ES modules friendly code:

```ts
// Absolute paths: an npm module.
import 'npm/dist/main.js'; // ESM "exports" file auto resolved.
import 'npm/lib.js';

// Absolute paths: make use of `tsconfig.json` `baseUrl`.
import './subDir/file.js';
import './rootFile.js';

// Relative paths.
import './rootFile.js';
import './subDir/file.js';
```
