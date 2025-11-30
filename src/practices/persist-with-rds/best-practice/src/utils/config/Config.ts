  database: {
    target: {
      database: string;
      schema: string;
    };
    role: {
      cicd: {
        username: string;
        password: string;
      };
      crud: {
        username: string;
        password: string;
      };
    };
    tunnel: {
      local:
        | { via: 'jdbc'; host: string; port: number }
        | { via: 'rds-data-api'; resourceArn: string; secretArn: string; endpoint: string | null };
      lambda:
        | { via: 'jdbc'; host: string; port: number }
        | { via: 'rds-data-api'; resourceArn: string; secretArn: string; endpoint: string | null }
        | null;
    };
  };
