export interface Config {
  organization: string;
  project: string;
  environment: {
    access: 'test' | 'dev' | 'prod';
  };
  aws: {
    account: string;
    namespace: string;
  };
