module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  extends: [
    'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:import/recommended', // specifies good import rules
    'airbnb-typescript/base', // uses the airbnb recommended rules
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    'import/extensions': 'off', // too many false positives; should figure out why
    'react/react-in-jsx-scope': 'off', // https://stackoverflow.com/a/68315971/3068233
    'react/no-unescaped-entities': 'off', // too invasive -> not seeing the value either
    '@typescript-eslint/explicit-function-return-type': 'off', // this can be figured out implicitly, and that is better
    'sort-imports': 'off',
    'import/prefer-default-export': 'off', // default export = bad
    'import/no-default-export': 'error', // require named exports - they make it easier to refactor, enforce consistency, and increase constraints
    '@typescript-eslint/no-non-null-assertion': 'off', // we use these to help typescript out when we know something it doesnt, and cant easily express that
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.ts',
          '**/*.test.integration.ts',
          '**/*.test.acceptance.ts',
          'acceptance/**/*.ts',
          '**/__test_utils__/**/*.ts',
          'provision/**/*.ts',
        ],
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off', // sometimes this is a valid definition
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'import/no-cycle': 'off',
    'max-classes-per-file': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    'prefer-destructuring': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'lines-between-class-members': 'off',
    '@typescript-eslint/lines-between-class-members': 'off',
    'no-return-await': 'off', // this does not help anything and actually leads to bugs if we subsequently wrap the return in a try catch without remembering to _then_ add await
    '@typescript-eslint/return-await': 'off',
    '@typescript-eslint/no-unsafe-declaration-merging': 'off',
    '@typescript-eslint/default-param-last': 'off', // interferes with input vs context
  },
  settings: {
    'import/ignore': ['react-native'], // https://github.com/facebook/react-native/issues/28549
  },
};
