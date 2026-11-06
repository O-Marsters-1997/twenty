import { getWorkspaceUrl } from '~/utils/getWorkspaceUrl';

describe('getWorkspaceUrl', () => {
  it('should return the subdomain url', () => {
    expect(
      getWorkspaceUrl({ subdomainUrl: 'https://subdomain.example.com' }),
    ).toBe('https://subdomain.example.com');
  });
});
