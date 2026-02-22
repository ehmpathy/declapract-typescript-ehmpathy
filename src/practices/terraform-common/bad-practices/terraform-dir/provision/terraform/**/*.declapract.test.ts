import { fix } from './*.declapract';

describe('terraform-dir catch-all', () => {
  it('should move json files from provision/terraform/ to provision/aws/', async () => {
    const contents = '{}';
    const context = {
      relativeFilePath: 'provision/terraform/config/variables.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('provision/aws/config/variables.json');
    expect(result.contents).toBe(contents);
  });

  it('should move files in hidden directories', async () => {
    const contents = 'test content';
    const context = {
      relativeFilePath: 'provision/terraform/.config/secrets.json',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('provision/aws/.config/secrets.json');
  });

  it('should move tf files (same as specific pattern)', async () => {
    const contents = 'resource "aws_instance" "example" {}';
    const context = {
      relativeFilePath: 'provision/terraform/main.tf',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('provision/aws/main.tf');
  });

  it('should move hcl files (same as specific pattern)', async () => {
    const contents = 'terraform { required_version = ">= 1.0" }';
    const context = {
      relativeFilePath: 'provision/terraform/.terraform.lock.hcl',
    } as any;

    const result = await fix(contents, context);

    expect(result.relativeFilePath).toBe('provision/aws/.terraform.lock.hcl');
  });
});
