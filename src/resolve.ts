import * as helper from './helper';
import * as path from 'path';
import Logger from './logger';
import { PackageJSON } from './def';

function checkFileExistsAndLog(file: string, logger: Logger | null) {
  logger?.log(`Checking if "${file}" exists`);
  return helper.fileExists(file);
}

// Resolves the given import path into a file in the specified directory.
// Example:
//  dir=a/b, importPath=c, returns a/b/c.js or a/b/c/index.js.
export function resolveCommonJSFile(
  dir: string,
  importPath: string,
  ts: boolean,
  logger: Logger | null,
): string | null {
  const addExt = ts ? helper.tsPath : helper.jsPath;

  let targetFile = addExt(path.join(dir, importPath));
  if (checkFileExistsAndLog(targetFile, logger)) {
    return targetFile;
  }

  targetFile = addExt(path.join(dir, importPath, 'index'));
  if (checkFileExistsAndLog(targetFile, logger)) {
    return targetFile;
  }
  return null;
}

// Make sure import sub-paths always start with './'.
function formatSubPath(s: string): string {
  return s.startsWith('.') ? s : `./${s}`;
}

export function resolveESM(
  moduleDir: string,
  importPath: string,
  pkgPath: string,
  pkg: PackageJSON,
): string | null {
  // Whether import path has sub paths i.e. `mod/a`.
  const hasSubImportPath = importPath.includes('/');
  const exports = pkg.exports ?? pkg.main;
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
