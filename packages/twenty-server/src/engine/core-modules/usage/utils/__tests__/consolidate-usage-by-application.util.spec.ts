import { type FlatApplicationCacheMaps } from 'src/engine/core-modules/application/types/flat-application-cache-maps.type';
import { type FlatApplication } from 'src/engine/core-modules/application/types/flat-application.type';
import { consolidateUsageByApplication } from 'src/engine/core-modules/usage/utils/consolidate-usage-by-application.util';

const buildFlatApplicationMaps = (
  applications: Array<Partial<FlatApplication> & { id: string }>,
): FlatApplicationCacheMaps => ({
  byId: Object.fromEntries(
    applications.map((application) => [
      application.id,
      application as FlatApplication,
    ]),
  ),
  idByUniversalIdentifier: {},
});

describe('consolidateUsageByApplication', () => {
  it('should merge rows of one application into a slice under its name, largest first', () => {
    const result = consolidateUsageByApplication({
      items: [
        { applicationId: 'app-1', operation: '', creditsUsed: 300 },
        { applicationId: 'app-2', operation: '', creditsUsed: 500 },
        { applicationId: 'app-1', operation: '', creditsUsed: 400 },
      ],
      flatApplicationMaps: buildFlatApplicationMaps([
        { id: 'app-1', name: 'First' },
        { id: 'app-2', name: 'Second' },
      ]),
    });

    expect(result).toEqual([
      { key: 'First', label: 'First', creditsUsed: 700 },
      { key: 'Second', label: 'Second', creditsUsed: 500 },
    ]);
  });

  it('should fall back to the application id when the application is gone', () => {
    const result = consolidateUsageByApplication({
      items: [{ applicationId: 'app-3', operation: '', creditsUsed: 10 }],
      flatApplicationMaps: buildFlatApplicationMaps([]),
    });

    expect(result).toEqual([{ key: 'app-3', label: 'app-3', creditsUsed: 10 }]);
  });
});
