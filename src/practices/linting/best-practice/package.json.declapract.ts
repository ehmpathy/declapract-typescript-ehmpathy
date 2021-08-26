import expect from 'expect';

// TODO: use min package versions
export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      devDependencies: expect.objectContaining({
        eslint: '6.1.0',
        '@typescript-eslint/eslint-plugin': '2.19.0',
        '@typescript-eslint/parser': '2.19.0',
        'eslint-config-airbnb-base': '14.0.0',
        'eslint-config-airbnb-typescript': '7.0.0',
        'eslint-config-prettier': '6.10.0',
        'eslint-plugin-import': '2.20.1',
        'eslint-plugin-prettier': '3.1.2',
      }),
      scripts: expect.objectContaining({
        'test:lint': 'eslint -c ./.eslintrc.js src/**/*.ts',
      }),
    }),
  );
