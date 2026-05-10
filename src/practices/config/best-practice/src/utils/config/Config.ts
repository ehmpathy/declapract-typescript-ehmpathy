export interface Config {
  organization: string;
  project: string;
  environment: {
    access: 'test' | 'prep' | 'prod';
  };
  aws: {
    account: string;
    namespace: string;
  };
