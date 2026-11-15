import { styled } from '@linaria/react';
import { useId } from 'react';

import { IconCheck } from 'twenty-ui/icon';
import { Radio } from 'twenty-ui/primitives/input';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import { SettingsAppearancePreview } from '~/pages/settings/profile/appearance/components/SettingsAppearancePreview';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
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

const StyledCheckmark = styled.div`
  align-items: center;
  background-color: ${themeCssVariables.color.blue};
  border-radius: ${themeCssVariables.border.radius.rounded};
  bottom: ${themeCssVariables.spacing[2]};
  color: ${themeCssVariables.grayScale.gray1};
  corner-shape: round;
  display: flex;
  height: ${themeCssVariables.spacing[5]};
  inset-inline-end: ${themeCssVariables.spacing[2]};
  justify-content: center;
  opacity: 0;
  position: absolute;
  transition:
    opacity 0.3s ease-in-out,
    visibility 0s linear 0.3s;
  visibility: hidden;
  width: ${themeCssVariables.spacing[5]};

  [data-checked] > & {
    opacity: 1;
    transition:
      opacity 0.3s ease-in-out,
      visibility 0s;
    visibility: visible;
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    [data-checked] > & {
      transition: none;
    }
  }
`;

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
          <div {...stylex.props(styles.radio)}>
            <SettingsAppearancePreview colorScheme={colorScheme} />
            <StyledCheckmark aria-hidden>
              <IconCheck size={theme.icon.size.sm} />
            </StyledCheckmark>
          </div>
        }
      />
      <span id={labelId} {...stylex.props(styles.label)}>{label}</span>
    </label>
  );
};
