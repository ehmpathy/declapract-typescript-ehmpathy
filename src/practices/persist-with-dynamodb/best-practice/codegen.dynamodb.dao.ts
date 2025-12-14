import {
  DeclaredDaoSpecification,
  DeclaredDomainObjectIntrospectionPaths,
  DeclaredOutputDirectories,
} from 'dynamodb-dao-generator';

export const introspect: DeclaredDomainObjectIntrospectionPaths = [
  './src/domain.objects/index.ts',
];

export const directories: DeclaredOutputDirectories = {
  terraform: `provision/aws/product`,
  dao: `src/access/daos`,
};

export const specifications: DeclaredDaoSpecification[] = [];
