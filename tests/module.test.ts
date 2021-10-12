import * as cm from './common.js';

it('CJS main', async () => {
  const name = 'cjsMain';
  cm.compile(name, {
    resolvers: [{ dir: cm.nodeModulesDir }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import '../../nodeModulesDir/cjsMain/main.js';
`,
    `import '../../nodeModulesDir/cjsMain/main.js';
`,
  );
});

it('package.json over index.js', async () => {
  const name = 'pkgOverIndex';
  cm.compile(name, {
    resolvers: [{ dir: cm.nodeModulesDir }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import '../../nodeModulesDir/pkgOverIndex/main.js';
`,
    `import '../../nodeModulesDir/pkgOverIndex/main.js';
`,
  );
});

it('CJS module field', async () => {
  const name = 'cjsModuleField';
  cm.compile(name, {
    resolvers: [{ dir: cm.nodeModulesDir }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import '../../nodeModulesDir/cjsModuleField/dist/esm.js';
`,
    `import '../../nodeModulesDir/cjsModuleField/dist/esm.js';
`,
  );
});

it('ESM exports field', async () => {
  const name = 'esmExportsField';
  cm.compile(name, {
    resolvers: [{ dir: cm.nodeModulesDir }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import '../../nodeModulesDir/esmExportsField/dist/esm.js';
`,
    `import '../../nodeModulesDir/esmExportsField/dist/esm.js';
`,
  );
});
