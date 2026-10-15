const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
    { ignores: ['node_modules/', 'data/'] },
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: 'commonjs',
            globals: { ...globals.node },
        },
        rules: {
            eqeqeq: 'error',
            'prefer-const': 'warn',
            'no-var': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
            'no-empty': ['error', { allowEmptyCatch: true }],
            // The embeds use wide spaces (U+3000) on purpose to space out emojis
            'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true }],
        },
    },
];
