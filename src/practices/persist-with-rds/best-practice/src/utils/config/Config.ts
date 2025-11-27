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
      local: {
        host: string;
        port: number;
      };
      lambda: {
        host: string;
        port: number;
      } | null;
    };
  };
