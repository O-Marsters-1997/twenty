import { useId } from 'react';

import { IconCheck } from 'twenty-ui/icon';
import { Radio } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import { SettingsAppearancePreview } from '~/pages/settings/profile/appearance/components/SettingsAppearancePreview';
import { appearanceRadioMarker } from './SettingsAppearanceOption.stylex';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  grayScale,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  choice: {
    flex: { default: '1 1 0', [media.mobile]: '0 0 160px' },
    display: 'flex',
    flexDirection: 'column',
    minWidth: '0',
  },
  radio: {
    display: 'block',
    outlineOffset: {
      default: null,
      [media.mobile]: { default: null, ':focus-visible': '-2px' },
    },
    position: 'relative',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    width: '100%',
  },
  label: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginTop: spacing['--t-spacing-2'],
  },
  checkmark: {
    cornerShape: 'round',
    transition: {
      default: 'opacity 0.3s ease-in-out, visibility 0s linear 0.3s',
      [stylex.when.ancestor(':is([data-checked])', appearanceRadioMarker)]:
        'opacity 0.3s ease-in-out, visibility 0s',
      [media.reducedMotion]: 'none',
    },
    alignItems: 'center',
    backgroundColor: color['--t-color-blue'],
    color: grayScale['--t-gray-scale-gray1'],
    display: 'flex',
    insetInlineEnd: spacing['--t-spacing-2'],
    justifyContent: 'center',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':is([data-checked])', appearanceRadioMarker)]: 1,
    },
    position: 'absolute',
    visibility: {
      default: 'hidden',
      [stylex.when.ancestor(':is([data-checked])', appearanceRadioMarker)]:
        'visible',
    },
    borderBottomLeftRadius: borderRadius['--t-border-radius-rounded'],
    borderBottomRightRadius: borderRadius['--t-border-radius-rounded'],
    borderTopLeftRadius: borderRadius['--t-border-radius-rounded'],
    borderTopRightRadius: borderRadius['--t-border-radius-rounded'],
    bottom: spacing['--t-spacing-2'],
    height: spacing['--t-spacing-5'],
    width: spacing['--t-spacing-5'],
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
          <div {...stylex.props(appearanceRadioMarker, styles.radio)}>
            <SettingsAppearancePreview colorScheme={colorScheme} />
            <div aria-hidden {...stylex.props(styles.checkmark)}>
              <IconCheck size={theme.icon.size.sm} />
            </div>
          </div>
        }
      />
      <span id={labelId} {...stylex.props(styles.label)}>
        {label}
      </span>
    </label>
  );
};
