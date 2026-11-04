import { resolveSyncedApplicationCapabilities } from 'src/engine/core-modules/application/utils/resolve-synced-application-capabilities.util';

describe('resolveSyncedApplicationCapabilities', () => {
  it('should let a workspace-owned application sync its manifest', () => {
    expect(
      resolveSyncedApplicationCapabilities({
        grantedCapabilities: ['microphone'],
        requestedCapabilities: ['camera'],
      }),
    ).toEqual(['microphone', 'camera']);
  });

  it('should preserve existing grants when the manifest no longer declares them', () => {
    expect(
      resolveSyncedApplicationCapabilities({
        grantedCapabilities: ['microphone'],
        requestedCapabilities: undefined,
      }),
    ).toEqual(['microphone']);
  });

  it('should treat a column hidden by a pending upgrade as an empty grant', () => {
    expect(
      resolveSyncedApplicationCapabilities({
        grantedCapabilities: undefined,
        requestedCapabilities: ['microphone'],
      }),
    ).toEqual(['microphone']);
  });

  it('should ignore capabilities outside the supported set', () => {
    expect(
      resolveSyncedApplicationCapabilities({
        grantedCapabilities: [],
        requestedCapabilities: ['microphone', 'screen', 'Camera'],
      }),
    ).toEqual(['microphone']);
  });
});
