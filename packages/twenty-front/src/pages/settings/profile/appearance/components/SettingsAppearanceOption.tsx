import { useId } from 'react';

import { appearanceRadioMarker } from './SettingsAppearance.stylex';

import { IconCheck } from 'twenty-ui/icon';
import { Radio } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import { SettingsAppearancePreview } from '~/pages/settings/profile/appearance/components/SettingsAppearancePreview';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, color, grayScale, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  checkmark: {
    alignItems: 'center',
    backgroundColor: color['--t-color-blue'],
    borderRadius: borderRadius['--t-border-radius-rounded'],
    bottom: spacing['--t-spacing-2'],
    color: grayScale['--t-gray-scale-gray1'],
    cornerShape: 'round',
    display: 'flex',
    height: spacing['--t-spacing-5'],
    insetInlineEnd: spacing['--t-spacing-2'],
    justifyContent: 'center',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':is([data-checked])', appearanceRadioMarker)]: 1,
    },
    position: 'absolute',
    transitionDuration: {
      default: '0.3s',
      [media.reducedMotion]: '0s',
    },
    transitionProperty: 'opacity, visibility',
    transitionTimingFunction: 'ease-in-out',
    visibility: {
      default: 'hidden',
      [stylex.when.ancestor(':is([data-checked])', appearanceRadioMarker)]:
        'visible',
    },
    width: spacing['--t-spacing-5'],
  },
  choice: {
    display: 'flex',
    flex: { default: '1 1 0', [media.mobile]: '0 0 160px' },
    flexDirection: 'column',
    minWidth: '0',
  },
  radio: {
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'block',
    position: 'relative',
    width: '100%',
    outlineOffset: { default: null, [media.mobile]: { default: null, ':focus-visible': '-2px' } },
  },
  label: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginTop: spacing['--t-spacing-2'],
  },
});

type SettingsAppearanceOptionProps = {
  colorScheme: ColorScheme;
  label: string;
};

export const SettingsAppearanceOption = ({
  colorScheme,
  label,
}: SettingsAppearanceOptionProps) => {
  const theme = useTheme();
  const labelId = useId();

  return (
    <label {...stylex.props(styles.choice)}>
      <Radio
        value={colorScheme}
        aria-labelledby={labelId}
        render={
          <div {...stylex.props(styles.radio, appearanceRadioMarker)}>
            <SettingsAppearancePreview colorScheme={colorScheme} />
            <div {...stylex.props(styles.checkmark)} aria-hidden>
              <IconCheck size={theme.icon.size.sm} />
            </div>
          </div>
        }
      />
      <span id={labelId} {...stylex.props(styles.label)}>{label}</span>
    </label>
  );
};
