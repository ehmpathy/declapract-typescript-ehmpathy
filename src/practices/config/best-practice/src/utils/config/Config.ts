export interface Config {
  organization: string;
  project: string;
  environment: {
    access: string;
  };
  aws: {
    account: string;
    namespace: string;
  };
