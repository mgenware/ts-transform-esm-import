import * as path from 'path';
import * as ts from 'typescript';
import * as fs from 'fs';

export function pathWithExt(s: string, ext: string): string {
  if (path.extname(s) === `.${ext}`) {
    return s;
  }
  return `${s}.${ext}`;
}

// a or a.js -> a.js
export function jsPath(s: string): string {
  return pathWithExt(s, 'js');
}

// a or a.js -> a.ts
export function tsPath(s: string): string {
  const ext = path.extname(s);
  if (ext === '.js') {
    return `${s.substring(0, s.length - '.js'.length)}.ts`;
  }

  return `${s}.ts`;
}

export function fileExists(s: string): boolean {
  return fs.existsSync(s);
}

export function pathMustExist(s: string): string {
  if (!fileExists(s)) {
    const msg = `The path "${s}" doesn't exist`;
    console.error(`ERROR: ${msg}`);
  }
  return s;
}

export function relativePath(from: string, to: string): string {
  const res = path.relative(from, to);
  if (res[0] !== '.') {
    return `./${res}`;
  }
  return res;
}

export function isDynamicImport(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
}

export function changeTSToJS(file: string): string {
  if (path.extname(file) === '.ts') {
    return `${file.substr(0, file.length - 3)}.js`;
  }
  return file;
}

export function getDestImportFromProjectTS(
  currentDir: string,
  targetFile: string,
  rootDir: string,
  outDir: string,
): string {
  const rel = relativePath(rootDir, changeTSToJS(targetFile));
  const destAbs = path.join(outDir, rel);
  return relativePath(currentDir, destAbs);
}

export function getDestImportFromExternalJS(currentDir: string, targetFile: string): string {
  return relativePath(currentDir, targetFile);
}

export function getDestFile(sf: ts.SourceFile, rootDir: string, outDir: string): string {
  if (!sf.fileName) {
    throw new Error(`Unexpected empty file name at ${sf.getText()}`);
  }
  const absPath = path.resolve(sf.fileName);
  const relPath = relativePath(rootDir, absPath);
  return path.join(outDir, relPath);
}

export function getModuleNameFromImport(importPath: string): string {
  const idx = importPath.indexOf('/');
  return idx >= 0 ? importPath.substring(0, idx) : importPath;
}
