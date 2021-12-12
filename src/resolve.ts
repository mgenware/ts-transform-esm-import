import * as path from 'path';
import * as helper from './helper';
import Logger from './logger';
import { PackageJSON } from './def';

function checkFileExistsAndLog(file: string, logger: Logger | null) {
  logger?.log(`Checking if "${file}" exists`);
  return helper.fileExists(file);
}

// Resolves the given import path like a regular CommonJS import.
// Example:
//  resolverDir=a/b, importPath=c, returns a/b/c.js or a/b/c/index.js.
export function resolveRegularCJMFile(
  resolverDir: string,
  importPath: string,
  ts: boolean,
  logger: Logger | null,
): string | null {
  const addExt = ts ? helper.tsPath : helper.jsPath;

  let targetFile = addExt(path.join(resolverDir, importPath));
  if (checkFileExistsAndLog(targetFile, logger)) {
    return targetFile;
  }

  targetFile = addExt(path.join(resolverDir, importPath, 'index'));
  if (checkFileExistsAndLog(targetFile, logger)) {
    return targetFile;
  }
  return null;
}

// Make sure import sub-paths always start with './'.
function formatSubPath(s: string): string {
  return s.startsWith('.') ? s : `./${s}`;
}

// Resolves the given import path under an ES module.
export function resolveESM(
  // `node_modules` path.
  _resolverDir: string,
  // User import path in code.
  importPath: string,
  // Root path of this module.
  moduleDir: string,
  // Path of `package.json`.
  pkgPath: string,
  // Object content of `package.json`.
  pkg: PackageJSON,
  logger: Logger | null,
): string | null {
  // Whether import path has sub paths i.e. `mod/a`.
  const hasSubImportPath = importPath.includes('/');
  logger?.log(`${importPath} has sub-paths: ${hasSubImportPath}`);
  const exports = pkg.exports ?? pkg.main;
  logger?.log(`Got \`exports\`: ${JSON.stringify(exports)}`);
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!exports) {
    throw new Error(
      `Fatal error: the package "${pkgPath}" is ESM but doesn't have a valid entrypoint`,
    );
  }
  if (typeof exports === 'string') {
    if (hasSubImportPath) {
      throw new Error(
        `Fatal error: you're using sub-paths in "${importPath}", but the package "${pkgPath}" only supports a single entry "${exports}"`,
      );
    }
    return path.join(moduleDir, exports);
    // eslint-disable-next-line no-else-return
  } else if (typeof exports === 'object') {
    const userSubPath = formatSubPath(
      hasSubImportPath ? importPath.substring(importPath.indexOf('/') + 1) : '.',
    );

    // Make sure all keys in `exports` start with '.'.
    const exportedSubPaths: Record<string, string> = {};
    for (const [k, v] of Object.entries(exports)) {
      exportedSubPaths[formatSubPath(k)] = v;
    }
    const mappedPath = exportedSubPaths[userSubPath];
    if (mappedPath) {
      // Found a sub-path match.
      return path.join(moduleDir, mappedPath);
    }
    throw new Error(
      `Fatal error: "${importPath}" doesn't have a match. Exported members "${JSON.stringify(
        exportedSubPaths,
      )}"`,
    );
  } else {
    throw new Error(`Fatal error: invalid package.json exports field, got "${exports}"`);
  }
}

// Resolves the given import path under a CommonJS module.
export function resolveCJM(
  // `node_modules` path.
  _resolverDir: string,
  // User import path in code.
  importPath: string,
  // Root path of this module.
  moduleDir: string,
  // Path of `package.json`.
  _pkgPath: string,
  // Object content of `package.json`.
  pkg: PackageJSON,
  logger: Logger | null,
): string | null {
  // Whether import path has sub paths i.e. `mod/a`.
  const hasSubImportPath = importPath.includes('/');
  logger?.log(`${importPath} has sub-paths: ${hasSubImportPath}`);
  const main = pkg.main ?? 'index.js';
  logger?.log(`Got \`main\`: ${JSON.stringify(exports)}`);
  if (hasSubImportPath) {
    return resolveRegularCJMFile(moduleDir, importPath, false, logger);
  }

  // Some CommonJS modules have a `module` field pointing to ESM entry file.
  // If this import path doesn't have sub-paths, try using the ESM entry first.
  if (pkg.module) {
    return path.join(moduleDir, pkg.module);
  }

  return path.join(moduleDir, main);
}
