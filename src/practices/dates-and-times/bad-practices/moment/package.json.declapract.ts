import expect from 'expect';

export const check = (contents: string | null) =>
  expect(JSON.parse(contents ?? '')).toMatchObject(
    expect.objectContaining({
      dependencies: expect.objectContaining({
        moment: expect.any(String),
      }),
    }),
  );
