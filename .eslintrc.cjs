module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['mgenware'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'import/extensions': 'off',
  },
};
