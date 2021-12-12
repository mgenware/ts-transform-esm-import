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
    `import '../../nodeModulesDir/cjsModuleField/d/esm.js';
`,
    `import '../../nodeModulesDir/cjsModuleField/d/esm.js';
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
    `import '../../nodeModulesDir/esmExportsField/d/esm.js';
`,
    `import '../../nodeModulesDir/esmExportsField/d/esm.js';
`,
  );
});

it('ESM subpath exports', async () => {
  const name = 'esmMultipleExports';
  cm.compile(name, {
    resolvers: [{ dir: cm.nodeModulesDir }],
  });
  await cm.verifyFile(
    name,
    'main',
    `import '../../nodeModulesDir/esmMultipleExports/d/lib.js';
import '../../nodeModulesDir/esmMultipleExports/d/sub/sub.js';
import '../../nodeModulesDir/esmMultipleExports/d/sub/sub.js';
`,
    `import '../../nodeModulesDir/esmMultipleExports/d/lib.js';
import '../../nodeModulesDir/esmMultipleExports/d/sub/sub.js';
import '../../nodeModulesDir/esmMultipleExports/d/sub/sub.js';
`,
  );
});
