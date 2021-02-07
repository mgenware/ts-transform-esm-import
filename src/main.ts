/* eslint-disable no-else-return */
/**
 * Based on https://github.com/dropbox/ts-transform-import-path-rewrite
 */
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

const indexJS = 'index.js';

export interface Opts {
  rootDir?: string;
  outDir?: string;
  resolvers?: string[];
}

function jsPath(s: string): string {
  if (path.extname(s) === '.js') {
    return s;
  }
  return `${s}.js`;
}

function fileExists(s: string): boolean {
  return fs.existsSync(s);
}

function relativePath(from: string, to: string): string {
  const res = path.relative(from, to);
  if (res[0] !== '.') {
    return `./${res}`;
  }
  return res;
}

function isDynamicImport(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function changeSourceExtension(file: string): string {
  if (path.extname(file) === '.ts') {
    return `${file.substr(0, file.length - 3)}.js`;
  }
  return file;
}

function getSourceFilePathInOutDir(sf: ts.SourceFile, rootDir: string, outDir: string): string {
  if (!sf.fileName) {
    throw new Error(`Unexpected empty file name at ${sf}`);
  }
  const sourceFileAbs = path.resolve(changeSourceExtension(sf.fileName));
  const sourceFileRelative = path.relative(rootDir, sourceFileAbs);
  return path.join(outDir, sourceFileRelative);
}

function importExportVisitor(
  ctx: ts.TransformationContext,
  sfOrBundle: ts.SourceFile | ts.Bundle,
  opts: Opts,
) {
  let sf: ts.SourceFile;
  if (ts.isSourceFile(sfOrBundle)) {
    sf = sfOrBundle;
  } else if (ts.isBundle(sfOrBundle)) {
    const source = sfOrBundle.sourceFiles[0];
    if (!source) {
      throw new Error(`No source file found in bundle ${sfOrBundle}`);
    }
    sf = source;
  }

  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    let importPath = '';
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      const importPathWithQuotes = node.moduleSpecifier.getText(sf);
      importPath = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2);
    } else if (isDynamicImport(node)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const importPathWithQuotes = node.arguments[0]!.getText(sf);
      importPath = importPathWithQuotes.substr(1, importPathWithQuotes.length - 2);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      // `.text` instead of `getText` bc this node doesn't map to sf (it's generated d.ts)
      importPath = node.argument.literal.text;
    }

    if (importPath && opts.rootDir && opts.outDir && opts.resolvers?.length) {
      const rootDir = path.resolve(opts.rootDir);
      const outDir = path.resolve(opts.outDir);
      const resolvers = opts.resolvers.map((p) => path.resolve(p));

      let s = importPath;

      // Track if this import has been rewritten.
      let resolved = false;

      // Rewrite absolute imports.
      if (s[0] !== '.') {
        // `importPath` is absolute.

        // `sf.fileName` is relative to project source dir, we need to map it
        // to the output dir.
        const sourcePath = getSourceFilePathInOutDir(sf, rootDir, outDir);
        const sourceDirPath = path.dirname(sourcePath);

        for (const resolver of resolvers) {
          const targetPath = path.join(resolver, s);
          // Check if `${resolver}/${import}.js` exists.
          let jsFile = jsPath(targetPath);
          if (fileExists(jsFile)) {
            s = relativePath(sourceDirPath, jsFile);
            resolved = true;
            break;
          }

          // Check if `${resolver}/${import}/index.js` exists.
          jsFile = path.join(targetPath, indexJS);
          if (fileExists(jsFile)) {
            s = relativePath(sourceDirPath, jsFile);
            resolved = true;
            break;
          }

          // Check if `${resolver}/${import}/package.json` exists.
          const packagePath = path.join(targetPath, 'package.json');
          if (fileExists(packagePath)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pkgInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as any;
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (!pkgInfo) {
              throw new Error(
                `Unexpected empty package.json content in import "${s}", path "${packagePath}"`,
              );
            }
            const pkgMain = (pkgInfo.exports ??
              pkgInfo.module ??
              pkgInfo.main ??
              indexJS) as string;
            jsFile = path.join(targetPath, pkgMain);

            if (fileExists(jsFile)) {
              s = relativePath(sourceDirPath, jsFile);
              resolved = true;
              break;
            }
          }
        }
      } else {
        // `importPath` is relative.
        // Add js extension to relative paths.
        s = jsPath(s);
        resolved = true;
      }

      // NOTE: Never throw errors on unrecognized absolute module names, cuz they
      // might be node builtin modules.

      if (resolved) {
        if (ts.isImportDeclaration(node)) {
          return ctx.factory.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.importClause,
            ctx.factory.createStringLiteral(s, true),
          );
        } else if (ts.isExportDeclaration(node)) {
          return ctx.factory.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            ctx.factory.createStringLiteral(s, true),
          );
        } else if (isDynamicImport(node)) {
          return ctx.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            ctx.factory.createNodeArray([ctx.factory.createStringLiteral(s, true)]),
          );
        } else if (ts.isImportTypeNode(node)) {
          return ctx.factory.updateImportTypeNode(
            node,
            ts.createLiteralTypeNode(ts.createStringLiteral(s, true)),
            node.qualifier,
            node.typeArguments,
            node.isTypeOf,
          );
        }
      }
      return node;
    }
    return ts.visitEachChild(node, visitor, ctx);
  };

  return visitor;
}

export function transform(opts: Opts): ts.TransformerFactory<ts.SourceFile | ts.Bundle> {
  // eslint-disable-next-line arrow-body-style
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile | ts.Bundle> => {
    return (sf: ts.SourceFile | ts.Bundle) => ts.visitNode(sf, importExportVisitor(ctx, sf, opts));
  };
}

export default transform;
