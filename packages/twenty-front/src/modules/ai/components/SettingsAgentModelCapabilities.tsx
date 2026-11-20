import { useResolvedAiModel } from '@/ai/hooks/useResolvedAiModel';
import { InputLabel } from '@/ui/input/components/internal/InputLabel/InputLabel';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { IconBrandX, IconWorld } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  checkbox: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'background-color',
    transitionTimingFunction: 'ease',
    height: spacing['--t-spacing-8'],
  },
  checkboxDisabled: {
    backgroundColor: 'transparent',
    cursor: 'not-allowed',
  },
  checkboxLabel: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
});

type ModelConfiguration = {
  webSearch?: {
    enabled: boolean;
    configuration?: Record<string, unknown>;
  };
  twitterSearch?: {
    enabled: boolean;
    configuration?: Record<string, unknown>;
  };
};

type SettingsAgentModelCapabilitiesProps = {
  selectedModelId: string;
  modelConfiguration: ModelConfiguration;
  onConfigurationChange: (configuration: ModelConfiguration) => void;
  disabled?: boolean;
};

export const SettingsAgentModelCapabilities = ({
  selectedModelId,
  modelConfiguration,
  onConfigurationChange,
  disabled = false,
}: SettingsAgentModelCapabilitiesProps) => {
  const theme = useTheme();
  const selectedModel = useResolvedAiModel(selectedModelId);
  const nativeCapabilities = selectedModel?.nativeCapabilities;

  if (!isDefined(nativeCapabilities)) {
    return null;
  }

  const showNativeWebSearch = nativeCapabilities.webSearch;
  const showNativeTwitterSearch = nativeCapabilities.twitterSearch;

  if (!showNativeWebSearch && !showNativeTwitterSearch) {
    return null;
  }

  const handleCapabilityToggle = (
    capability: 'webSearch' | 'twitterSearch',
    enabled: boolean,
  ) => {
    if (disabled) {
      return;
    }

    onConfigurationChange({
      ...modelConfiguration,
      [capability]: {
        enabled,
        configuration: modelConfiguration[capability]?.configuration || {},
      },
    });
  };

  const capabilities = [
    ...(showNativeWebSearch
      ? [
          {
            key: 'webSearch' as const,
            label: t`Web Search`,
            Icon: IconWorld,
            enabled: modelConfiguration.webSearch?.enabled || false,
          },
        ]
      : []),
    ...(showNativeTwitterSearch
      ? [
          {
            key: 'twitterSearch' as const,
            label: t`Twitter/X Search`,
            Icon: IconBrandX,
            enabled: modelConfiguration.twitterSearch?.enabled || false,
          },
        ]
      : []),
  ];

  return (
    <Section.Root>
      <InputLabel>{t`Enable model-specific features`}</InputLabel>
      <div>
        {capabilities.map((capability) => (
          <div
            {...stylex.props(
              styles.checkbox,
              disabled && styles.checkboxDisabled,
            )}
            key={capability.key}
            onClick={() =>
              handleCapabilityToggle(capability.key, !capability.enabled)
            }
          >
            <div {...stylex.props(styles.checkboxLabel)}>
              <capability.Icon size={theme.icon.size.sm} />
              <span>{capability.label}</span>
            </div>
            <Checkbox
              aria-label={capability.label}
              checked={capability.enabled}
              onCheckedChange={(isChecked) => {
                handleCapabilityToggle(capability.key, isChecked);
              }}
              disabled={disabled}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ))}
      </div>
    </Section.Root>
  );
};
