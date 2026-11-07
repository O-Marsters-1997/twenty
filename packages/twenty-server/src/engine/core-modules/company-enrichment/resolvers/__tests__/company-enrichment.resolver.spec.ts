import { Test, type TestingModule } from '@nestjs/testing';

import { type AuthContextUser } from 'src/engine/core-modules/auth/types/auth-context.type';
import { CompanyEnrichmentResolver } from 'src/engine/core-modules/company-enrichment/resolvers/company-enrichment.resolver';
import { CompanyEnrichmentService } from 'src/engine/core-modules/company-enrichment/services/company-enrichment.service';
import { PersonEnrichmentService } from 'src/engine/core-modules/company-enrichment/services/person-enrichment.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

describe('CompanyEnrichmentResolver', () => {
  let resolver: CompanyEnrichmentResolver;
  let companyEnrichmentService: { enrichCompanyForWorkspaceCreator: jest.Mock };
  let personEnrichmentService: { enrichPersonForWorkspaceCreator: jest.Mock };

  const user = { id: 'user-id', email: 'foo@acme.com' } as AuthContextUser;
  const workspace = { id: 'workspace-id' } as WorkspaceEntity;

  beforeEach(async () => {
    companyEnrichmentService = {
      enrichCompanyForWorkspaceCreator: jest.fn(),
    };
    personEnrichmentService = {
      enrichPersonForWorkspaceCreator: jest
        .fn()
        .mockResolvedValue({ outcome: 'unavailable', enrichment: null }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyEnrichmentResolver,
        {
          provide: CompanyEnrichmentService,
          useValue: companyEnrichmentService,
        },
        {
          provide: PersonEnrichmentService,
          useValue: personEnrichmentService,
        },
      ],
    }).compile();

    resolver = module.get<CompanyEnrichmentResolver>(CompanyEnrichmentResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should enrich the person alongside the company with the signup email', async () => {
    companyEnrichmentService.enrichCompanyForWorkspaceCreator.mockResolvedValue(
      { outcome: 'unavailable', enrichment: null },
    );
    personEnrichmentService.enrichPersonForWorkspaceCreator.mockResolvedValue({
      outcome: 'matched',
      enrichment: { email: 'foo@acme.com', fullName: 'Ada Lovelace' },
    });

    const result = await resolver.enrichWorkspaceCompany(user, workspace);

    expect(
      personEnrichmentService.enrichPersonForWorkspaceCreator,
    ).toHaveBeenCalledWith({
      userId: user.id,
      email: user.email,
      workspaceId: workspace.id,
    });
    expect(result.personOutcome).toBe('matched');
    expect(result.personEnrichment).toEqual({
      email: 'foo@acme.com',
      fullName: 'Ada Lovelace',
    });
  });
});
