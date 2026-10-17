import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({ maxConcurrent: 3 });