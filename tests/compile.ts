/* eslint-disable import/extensions */
import * as ts from 'typescript';
import { sync as globSync } from 'glob';
// eslint-disable-next-line import/no-named-default
import { default as dtsPathTransform, Opts as PathTransformOpts } from '../dist/main.js';
import * as path from 'path';

const CONFIG: ts.CompilerOptions = {
  experimentalDecorators: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  noEmitOnError: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
  stripInternal: true,
  declaration: true,
  target: ts.ScriptTarget.ESNext,
  newLine: ts.NewLineKind.LineFeed,
};

export default function compile(
  rootDir: string,
  outDir: string,
  transformOpts: PathTransformOpts,
  options: ts.CompilerOptions = CONFIG,
) {
  // eslint-disable-next-line no-param-reassign
  options = {
    ...options,
    rootDir,
    outDir,
  };

  const files = globSync(path.join(rootDir, '**/*.ts'));
  const compilerHost = ts.createCompilerHost(options);
  const program = ts.createProgram(files, options, compilerHost);

  const emitResult = program.emit(undefined, undefined, undefined, undefined, {
    after: [dtsPathTransform(transformOpts) as ts.TransformerFactory<ts.SourceFile>],
    afterDeclarations: [dtsPathTransform(transformOpts)],
  });

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    const { file } = diagnostic;
    if (!file) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { line, character } = file.getLineAndCharacterOfPosition(diagnostic.start!);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    // eslint-disable-next-line no-console
    console.log(`${file.fileName} (${line + 1},${character + 1}): ${message}`);
  });
}
