import { getEnvironment } from 'sdk-environment';

export { getEnvironment };

export const envStatic = getEnvironment.static();

// the access (`test | prep | prod`), re-exported flat for convenience. one axis, never a
// divergent deploy slug.
export const access = envStatic.access;
