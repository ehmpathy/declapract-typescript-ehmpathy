import {
  DeclaredDaoSpecification,
  DeclaredDomainObjectIntrospectionPaths,
  DeclaredOutputDirectories,
} from 'dynamodb-dao-generator';

export const introspect: DeclaredDomainObjectIntrospectionPaths = [
  './src/domain/index.ts',
];

export const directories: DeclaredOutputDirectories = {
  terraform: `provision/aws/product`,
  dao: `src/data/dao`,
};

export const specifications: DeclaredDaoSpecification[] = [];
