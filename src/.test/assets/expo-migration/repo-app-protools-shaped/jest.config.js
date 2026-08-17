// a stale JS jest config (jsdom) — the exact dual-source hazard the app-protools-native
// audit names. the go-forward is jest.config.ts (the tests-expo best-practice template),
// so the tests-any `javascript-config-files` bad-practice must DELETE this on `declapract
// fix`; the shipped .ts config then stands as the single source.
module.exports = {
  testEnvironment: 'jsdom',
  preset: 'jest-expo',
};
