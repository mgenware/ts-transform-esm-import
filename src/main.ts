/* eslint-disable no-param-reassign */
/* eslint-disable no-else-return */
/**
 * Based on https://github.com/dropbox/ts-transform-import-path-rewrite
 */
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as helper from './helper';

export interface PackageJSON {
  name: string;
  version?: string;
  main?: string;
  exports?: string | Record<string, string>;
  type?: string;
  module?: string;
}

export interface Resolver {
  dir: string;
  sourceDir?: boolean;
}

export interface Opts {
  rootDir?: string;
  outDir?: string;
  resolvers?: Resolver[];
  debug?: boolean;
}

function importExportVisitor(
  ctx: ts.TransformationContext,
  sfOrBundle: ts.SourceFile | ts.Bundle,
  opts: Opts,
) {
  // eslint-disable-next-line no-console
  const log: (s: string) => void = opts.debug ? (s) => console.log(`🐤 ${s}`) : () => {};
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
    } else if (helper.isDynamicImport(node)) {
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
      log(`Rewriting path "${importPath}"`);

      // Track if this import has been rewritten.
      let resolved = false;

      if (importPath[0] === '/' || importPath[0] === '\\') {
        throw new Error(
          `Please don't use absolute file-system paths. They may only work on your local machine.`,
        );
      }

      // Rewrite absolute imports.
      if (importPath[0] !== '.') {
        log(`Resolving absolute path "${importPath}"`);
        // `importPath` is absolute.
        const { rootDir, outDir, resolvers } = opts;
        const destFile = helper.getDestFile(sf, rootDir, outDir);
        const destDir = path.dirname(destFile);

        for (const r of resolvers) {
          const targetPath = path.join(r.dir, importPath);
          const addExt = r.sourceDir ? helper.tsPath : helper.jsPath;
          const getDestImport: (_: string) => string = r.sourceDir
            ? (s) => helper.getDestImportFromProjectTS(destDir, s, rootDir, outDir)
            : (s) => helper.getDestImportFromExternalJS(destDir, s);
          const indexJS = `index.${r.sourceDir ? 'ts' : 'js'}`;

          // Check if `${resolver.dir}/${import}.(js|ts)` exists.
          let targetFile = addExt(path.join(r.dir, importPath));
          log(`Checking if "${targetFile}" exists`);
          if (helper.fileExists(targetFile)) {
            importPath = getDestImport(targetFile);
            resolved = true;
            log(`Path resolved to "${importPath}"`);
            break;
          }

          // Check if `${resolver.dir}/${import}/package.json` exists.
          const packagePath = path.join(targetPath, 'package.json');
          log(`Checking if package.json "${targetFile}" exists`);
          if (helper.fileExists(packagePath) && !r.sourceDir) {
            log(`Found package.json "${packagePath}"`);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as PackageJSON;
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (typeof pkg !== 'object') {
              throw new Error(
                `package.json at "${importPath}" is not valid, path "${packagePath}", got "${JSON.stringify(
                  pkg,
                )}"`,
              );
            }

            let entryJS: string | undefined;
            if (pkg.type === 'module') {
              const { exports } = pkg;
              if (typeof exports === 'object') {
                // https://nodejs.org/api/packages.html#package-entry-points
                continue;
              } else {
                entryJS = exports ?? pkg.main;
              }
            } else {
              // Some commmonjs modules support a ESM entry via `module` field.
              entryJS = pkg.module ?? pkg.main;
            }
            if (!entryJS) {
              continue;
            }

            targetFile = path.join(targetPath, entryJS);
            log(`Checking if main field "${targetFile}" exists`);
            if (helper.fileExists(targetFile)) {
              importPath = getDestImport(targetFile);
              resolved = true;
              log(`Path resolved to "${importPath}"`);
              break;
            }
          }

          // Check if `${resolver}/${import}/index.(js|ts)` exists.
          targetFile = path.join(targetPath, indexJS);
          log(`Checking if "${targetFile}" exists`);
          if (helper.fileExists(targetFile)) {
            importPath = getDestImport(targetFile);
            resolved = true;
            log(`Path resolved to "${importPath}"`);
            break;
          }
        } // end of `for (const r of resolvers)`.
      } else {
        // `importPath` is relative.
        // Add js extension to relative paths.
        const res = helper.jsPath(importPath);
        log(`Relative path "${importPath}" resolved to "${res}"`);
        importPath = res;
        resolved = true;
      }

      // NOTE: Never throw errors on unrecognized absolute module names, cuz they
      // might be node builtin modules.

      if (resolved) {
        // Convert windows path to posix path.
        importPath = importPath.replace(/\\/g, '/');
        if (ts.isImportDeclaration(node)) {
          return ctx.factory.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.importClause,
            ctx.factory.createStringLiteral(importPath, true),
            node.assertClause,
          );
        } else if (ts.isExportDeclaration(node)) {
          return ctx.factory.updateExportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            ctx.factory.createStringLiteral(importPath, true),
            node.assertClause,
          );
        } else if (helper.isDynamicImport(node)) {
          return ctx.factory.updateCallExpression(
            node,
            node.expression,
            node.typeArguments,
            ctx.factory.createNodeArray([ctx.factory.createStringLiteral(importPath, true)]),
          );
        } else if (ts.isImportTypeNode(node)) {
          return ctx.factory.updateImportTypeNode(
            node,
            ts.createLiteralTypeNode(ts.createStringLiteral(importPath, true)),
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
  if (!opts.rootDir) {
    throw new Error('Missing required argument `rootDir`');
  }
  if (!opts.outDir) {
    throw new Error('Missing required argument `outDir`');
  }
  opts.rootDir = helper.pathMustExist(path.resolve(opts.rootDir));
  opts.outDir = path.resolve(opts.outDir);
  opts.resolvers ??= [];
  for (const r of opts.resolvers) {
    r.dir = helper.pathMustExist(path.resolve(r.dir));
  }
  if (!opts.resolvers.length) {
    console.warn('WARNING: No resolvers defined');
  }

  if (opts.debug) {
    // eslint-disable-next-line no-console
    console.log(
      `🚄 ts-transform-esm-import arguments:\nrootDir: ${opts.rootDir}\noutDir: ${
        opts.outDir
      }\nresolvers: ${JSON.stringify(opts.resolvers)}`,
    );
  }

  return (ctx: ts.TransformationContext): ts.Transformer<ts.SourceFile | ts.Bundle> =>
    (sf: ts.SourceFile | ts.Bundle) =>
      ts.visitNode(sf, importExportVisitor(ctx, sf, opts));
}

export default transform;
