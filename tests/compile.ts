import * as ts from 'typescript';
import { sync as globSync } from 'glob';
import { transform as dtsPathTransform, Opts as PathTransformOpts } from './src';

const CJS_CONFIG: ts.CompilerOptions = {
  experimentalDecorators: true,
  jsx: ts.JsxEmit.React,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  noEmitOnError: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
  stripInternal: true,
  declaration: true,
  baseUrl: __dirname,
  target: ts.ScriptTarget.ESNext,
};

export default function compile(
  input: string,
  transformOpts: PathTransformOpts,
  options: ts.CompilerOptions = CJS_CONFIG,
) {
  const files = globSync(input);
  const compilerHost = ts.createCompilerHost(options);
  const program = ts.createProgram(files, options, compilerHost);

  const msgs = {};

  const emitResult = program.emit(undefined, undefined, undefined, undefined, {
    after: [dtsPathTransform(transformOpts) as ts.TransformerFactory<ts.SourceFile>],
    afterDeclarations: [dtsPathTransform(transformOpts)],
  });

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { line, character } = diagnostic.file!.getLineAndCharacterOfPosition(diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
  });

  return msgs;
}
