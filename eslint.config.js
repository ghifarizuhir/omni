// @ts-check
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    // Global ignores
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/**',
      'prisma/migrations/**',
      '**/*.config.ts',
      '**/*.config.js',
      'eslint.config.js',
    ],
  },
  {
    // Operational route files must go through req.scoped.* — no direct DB.
    files: ['server/routes/**/*.ts'],
    ignores: [
      'server/routes/admin.ts',
      'server/routes/admin/dataQuality.ts',
      'server/routes/platform.ts',
      'server/routes/auth.ts',
      'server/routes/integrations.ts',
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: '../db',          message: 'route files must use req.scoped, not prisma directly' },
          { name: '@prisma/client', message: 'route files must use req.scoped, not the Prisma client' },
        ],
        // Repository imports are still permitted for the warn/off bypass path;
        // we rely on convention + code review, not the linter, to police them.
        // (If we ban repo imports too, the bypass pattern can't compile.)
      }],
    },
  },
];
