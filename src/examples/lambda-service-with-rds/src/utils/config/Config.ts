export interface Config {
  database: {
    service: {
      host: string;
      port: number;
      database: string;
      schema: string;
      username: string;
      password: string;
    };
  };
}
