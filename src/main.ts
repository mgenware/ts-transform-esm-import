/* eslint-disable no-else-return */
/**
 * Based on https://github.com/dropbox/ts-transform-import-path-rewrite
 */
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

export interface Opts {
  baseDir?: string;
  nodeModulesDir?: string;
  nodeModulesOutputDir?: string;
  enforceExtension?: string;
  preprocess?(importPath: string, sourceFilePath: string): string;
  postprocess?(importPath: string, sourceFilePath: string): string;
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

function isDynamicImport(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword;
}

function mustGetNodeModulesOutputDir(opts: Opts): string {
  if (!opts.nodeModulesOutputDir) {
    throw new Error('`nodeModulesOutputDir` cannot be empty when `nodeModulesDir` is set');
  }
  return opts.nodeModulesOutputDir;
}

function importExportVisitor(ctx: ts.TransformationContext, sf: ts.SourceFile, opts: Opts) {
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

    if (importPath) {
      // Resolve option paths.
      if (opts.baseDir) {
        // eslint-disable-next-line no-param-reassign
        opts.baseDir = path.resolve(opts.baseDir);
      }
      if (opts.nodeModulesDir) {
        // eslint-disable-next-line no-param-reassign
        opts.nodeModulesDir = path.resolve(opts.nodeModulesDir);
      }

      let s = importPath;
      if (opts.preprocess) {
        s = opts.preprocess(importPath, sf.fileName);
      }

      // Rewrite absolute imports.
      let resolved = false;
      if (s[0] !== '.') {
        if (opts.baseDir) {
          const baseDirFile = jsPath(path.join(opts.baseDir, s));
          if (fileExists(baseDirFile)) {
            s = jsPath(`./${s}`);
            resolved = true;
          }
        }
        if (!resolved && opts.nodeModulesDir) {
          const { nodeModulesDir } = opts;
          if (s.includes('/')) {
            // Something like `import 'foo/abc/def'`
            const filePath = jsPath(path.join(nodeModulesDir, s));
            if (fileExists(filePath)) {
              s = jsPath(path.join(mustGetNodeModulesOutputDir(opts), s));
              resolved = true;
            }
          }
          if (!resolved) {
            // Try locating `./node_modules/foo/package.json`.
            const packagePath = path.join(nodeModulesDir, s, 'package.json');
            if (fileExists(packagePath)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pkgInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as any;
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!pkgInfo) {
                throw new Error(
                  `Unexpected empty package.json content in import "${s}", path "${packagePath}"`,
                );
              }
              const pkgMain = pkgInfo.exports as string | undefined;
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!pkgMain) {
                throw new Error(`"exports" field not found in package.json "${packagePath}"`);
              }
              s = path.join(mustGetNodeModulesOutputDir(opts), s, pkgMain);
              resolved = true;
            }
          }
        }
      } else {
        // Add js extension to relative paths.
        s = jsPath(s);
      }

      // Only rewrite relative path
      if (resolved) {
        if (ts.isImportDeclaration(node)) {
          return ctx.factory.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.importClause,
            ctx.factory.createStringLiteral(s),
          );
        } else if (ts.isExportDeclaration(node)) {
          return ctx.factory.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            ctx.factory.createStringLiteral(s),
          );
        } else if (isDynamicImport(node)) {
          return ctx.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            ctx.factory.createNodeArray([ctx.factory.createStringLiteral(s)]),
          );
        } else if (ts.isImportTypeNode(node)) {
          return ctx.factory.updateImportTypeNode(
            node,
            ts.createLiteralTypeNode(ts.createStringLiteral(s)),
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

export function transform(opts: Opts): ts.TransformerFactory<ts.SourceFile> {
  // eslint-disable-next-line arrow-body-style
  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    return (sf: ts.SourceFile) => ts.visitNode(sf, importExportVisitor(ctx, sf, opts));
  };
}
