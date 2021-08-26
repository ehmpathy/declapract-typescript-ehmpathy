import expect from 'expect';

export const check = async () => {
  return expect.objectContaining({
    license: expect.any(String), // we shouldn't have a license
  });
};
