import { currentWorkspaceState } from '@/auth/states/currentWorkspaceState';
import { SettingsOptionCardContentSwitch } from '@/settings/components/SettingsOptions/SettingsOptionCardContentSwitch';
import { useLabPublicFeatureFlags } from '@/settings/lab/hooks/useLabPublicFeatureFlags';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isNonEmptyString } from '@sniptt/guards';
import { useState } from 'react';
import { useIcons } from 'twenty-ui/icon';
import { Card } from 'twenty-ui/primitives/surfaces';
import { themeCssVariables } from 'twenty-ui/theme';
import { type FeatureFlagKey } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  cardGrid: {
    display: 'grid',
    gap: spacing['--t-spacing-4'],
    gridTemplateColumns: '1fr',
  },
  image: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-medium'],
    display: 'flex',
    height: '120px',
    objectFit: 'cover',
    width: '100%',
  },
});

export const SettingsLabContent = () => {
  const currentWorkspace = useAtomStateValue(currentWorkspaceState);
  const { getIcon } = useIcons();
  const { labPublicFeatureFlags, handleLabPublicFeatureFlagUpdate } =
    useLabPublicFeatureFlags();
  const [hasImageLoadingError, setHasImageLoadingError] = useState<
    Record<string, boolean>
  >({});

  const handleToggle = async (key: FeatureFlagKey, value: boolean) => {
    await handleLabPublicFeatureFlagUpdate(key, value);
  };

  const handleImageError = (key: string) => {
    setHasImageLoadingError((prev) => ({ ...prev, [key]: true }));
  };

  const labPublicFeatureFlagsWithImage = labPublicFeatureFlags.filter((flag) =>
    isNonEmptyString(flag.metadata.imagePath),
  );
  const labPublicFeatureFlagsWithoutImage = labPublicFeatureFlags.filter(
    (flag) => !isNonEmptyString(flag.metadata.imagePath),
  );

  return (
    currentWorkspace?.id && (
      <div {...stylex.props(styles.cardGrid)}>
        {labPublicFeatureFlagsWithImage.map((flag) => (
          <Card.Root
            key={flag.key}
            rounded
            backgroundColor={themeCssVariables.background.secondary}
          >
            {!hasImageLoadingError[flag.key] && (
              <img
                src={flag.metadata.imagePath ?? undefined}
                alt={flag.metadata.label}
                onError={() => handleImageError(flag.key)}
                {...stylex.props(styles.image)}
              />
            )}
            <SettingsOptionCardContentSwitch
              Icon={getIcon(flag.metadata.icon)}
              title={flag.metadata.label}
              description={flag.metadata.description}
              checked={flag.value}
              onChange={(value) => handleToggle(flag.key, value)}
            />
          </Card.Root>
        ))}

        {labPublicFeatureFlagsWithoutImage.length > 0 && (
          <Card.Root
            rounded
            backgroundColor={themeCssVariables.background.secondary}
          >
            {labPublicFeatureFlagsWithoutImage.map((flag, index) => (
              <SettingsOptionCardContentSwitch
                key={flag.key}
                Icon={getIcon(flag.metadata.icon)}
                title={flag.metadata.label}
                description={flag.metadata.description}
                checked={flag.value}
                onChange={(value) => handleToggle(flag.key, value)}
                divider={index < labPublicFeatureFlagsWithoutImage.length - 1}
              />
            ))}
          </Card.Root>
        )}
      </div>
    )
  );
};
