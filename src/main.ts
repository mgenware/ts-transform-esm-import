/* eslint-disable no-param-reassign */
/* eslint-disable no-else-return */
/**
 * Based on https://github.com/dropbox/ts-transform-import-path-rewrite
 */
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as helper from './helper';
import * as rsv from './resolve';
import * as def from './def';
import Logger from './logger';

export interface Opts {
  rootDir?: string;
  outDir?: string;
  resolvers?: def.Resolver[];
  debug?: boolean;
}

function importExportVisitor(
  ctx: ts.TransformationContext,
  sfOrBundle: ts.SourceFile | ts.Bundle,
  opts: Opts,
) {
  const logger = opts.debug ? new Logger() : null;
  const log: (s: string) => void = opts.debug ? (s) => logger?.log(s) : () => {};
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

      if (importPath[0] === '/' || importPath[0] === '\\') {
        throw new Error(
          "Please don't use absolute file-system paths. They may only work on your local machine.",
        );
      }

      // Resolve file path from current import path.
      let resolvedFile: string | null = null;
      if (importPath[0] !== '.') {
        // Rewrite bare specifiers.
        log(`Resolving bare specifiers "${importPath}"`);

        const { rootDir, outDir, resolvers } = opts;
        const destFile = helper.getDestFile(sf, rootDir, outDir);
        const destDir = path.dirname(destFile);

        for (const resolver of resolvers) {
          if (resolver.filter) {
            log(`Got filter "${resolver.filter}"`);
            if (!new RegExp(resolver.filter, 'i').test(importPath)) {
              log('Filter testing failed. Skipping this resolver');
              continue;
            }
          }

          const { mode } = resolver;
          if (mode) {
            log(`Got mode "${mode}"`);
            switch (mode) {
              case 'addExt': {
                resolvedFile = helper.jsPath(importPath);
                log(`Import "${importPath}" resolved to "${resolvedFile}"`);
                log(`✅ Updated import from "${importPath}" to "${resolvedFile}"`);
                importPath = resolvedFile;
                continue;
              }

              default: {
                throw new Error(`Unknown mode "${mode}"`);
              }
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-loop-func
          const resolveAsCommonJSFunc = () =>
            (resolvedFile = rsv.resolveCJSImport(
              resolver.dir,
              importPath,
              !!resolver.sourceDir,
              logger,
            ));
          if (resolver.sourceDir) {
            log('`sourceDir` is true');
            // If resolver is in source directory (`resolver.sourceDir` is true).
            // resolve the import path as a normal CommonJS import.
            resolveAsCommonJSFunc();
          } else {
            log('`sourceDir` is false');
            // Resolver is in `node_modules`, import resolving depends on if the module
            // is an ESM or not.

            // First extract the module name and check if it's an ESM.
            const moduleName = helper.getModuleNameFromImport(importPath);
            const modulePath = path.join(resolver.dir, moduleName);
            const packagePath = path.join(modulePath, 'package.json');
            if (helper.fileExists(packagePath)) {
              log(`"${packagePath}" exists`);
              // Found the npm module of the import path.

              // Get the contents of `package.json`.
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as def.PackageJSON;
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (typeof pkg !== 'object') {
                throw new Error(
                  `Fatal error: package.json at "${packagePath}" is not a valid object`,
                );
              }

              const isESM = pkg.type === 'module';
              log(`"${packagePath}" is ESM? ${isESM}`);
              if (isESM) {
                // ESM. Resolve using ESM logic.
                resolvedFile = rsv.resolveInESModule(
                  resolver.dir,
                  importPath,
                  modulePath,
                  packagePath,
                  pkg,
                  logger,
                );
              } else {
                // Not an ESM, resolving as a CommonJS module (CJM).
                resolvedFile = rsv.resolveInCJSModule(
                  resolver.dir,
                  importPath,
                  modulePath,
                  packagePath,
                  pkg,
                  logger,
                );
              }
            } else {
              log(`"${packagePath}" doesn't exist`);
              // Oh no, no npm module found in the import path.
              // Resolve it as a CommonJS import.
              resolveAsCommonJSFunc();
            }
          }

          log(`Resolver done with result: "${resolvedFile}"`);
          if (resolvedFile) {
            const getDestImport: (_: string) => string = resolver.sourceDir
              ? (s) => helper.getDestImportFromProjectTS(destDir, s, rootDir, outDir)
              : (s) => helper.getDestImportFromExternalJS(destDir, s);
            // Update import path if it's resolved.
            const newImportPath = getDestImport(resolvedFile);
            log(`✅ Updated import from "${importPath}" to "${newImportPath}"`);
            importPath = newImportPath;
            break;
          }
        } // end of `for (const r of resolvers)`.
      } else {
        // `importPath` is relative.
        // Add js extension to relative paths.
        resolvedFile = helper.jsPath(importPath);
        log(`Relative path "${importPath}" resolved to "${resolvedFile}"`);
        log(`✅ Updated import from "${importPath}" to "${resolvedFile}"`);
        importPath = resolvedFile;
      }

      // NOTE: Never throw errors on unrecognized absolute module names, cuz they
      // might be node builtin modules.

      if (resolvedFile) {
        // Convert windows path to posix path.
        importPath = importPath.replace(/\\/g, '/');
        if (ts.isImportDeclaration(node)) {
          return ctx.factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            ctx.factory.createStringLiteral(importPath, true),
            node.assertClause,
          );
        } else if (ts.isExportDeclaration(node)) {
          return ctx.factory.updateExportDeclaration(
            node,
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
            ctx.factory.createLiteralTypeNode(ctx.factory.createStringLiteral(importPath, true)),
            node.assertions,
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
