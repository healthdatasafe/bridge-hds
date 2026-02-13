import neostandard from 'neostandard';

export default [
  ...neostandard({ semi: true }),
  {
    ignores: ['build/test/*', 'node_modules/*']
  },
  {
    files: ['tests/**/*.js', 'plugins/*/tests/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly'
      }
    }
  }
];
