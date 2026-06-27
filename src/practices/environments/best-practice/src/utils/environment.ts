import { getEnvironment } from 'sdk-environment';

export { getEnvironment };

export const envStatic = getEnvironment.static();

export const stage = envStatic.access;
export const serviceClientStage = stage === 'prod' ? 'prod' : 'prep';
