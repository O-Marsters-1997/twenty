import { type CSSProperties } from 'react';

import {
  GRAY_SCALE_DARK,
  GRAY_SCALE_LIGHT,
} from 'twenty-ui/theme';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import { borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';

import { appearanceRadioMarker } from './SettingsAppearance.stylex';

const styles = stylex.create({
  segment: {
    alignItems: 'flex-end',
    background: 'var(--appearance-preview-background)',
    borderColor: 'var(--appearance-preview-border)',
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'border-box',
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingInlineStart: spacing['--t-spacing-6'],
    paddingTop: spacing['--t-spacing-6'],
    borderEndStartRadius: {
      default: null,
      ':first-child': borderRadius['--t-border-radius-md'],
    },
    borderStartStartRadius: {
      default: null,
      ':first-child': borderRadius['--t-border-radius-md'],
    },
    borderEndEndRadius: {
      default: null,
      ':last-child': borderRadius['--t-border-radius-md'],
    },
    borderStartEndRadius: {
      default: null,
      ':last-child': borderRadius['--t-border-radius-md'],
    },
  },
  content: {
    background: 'var(--appearance-preview-content-background)',
    borderInlineStartColor: 'var(--appearance-preview-border)',
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: '1px',
    borderStartStartRadius: borderRadius['--t-border-radius-md'],
    borderTopColor: 'var(--appearance-preview-border)',
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    boxSizing: 'border-box',
    color: 'var(--appearance-preview-content-color)',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    fontSize: {
      default: '20px',
      [stylex.when.ancestor(':hover', appearanceRadioMarker)]: '22px',
    },
    height: {
      default: '56px',
      [stylex.when.ancestor(':hover', appearanceRadioMarker)]: '61px',
    },
    paddingInlineStart: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    transitionDuration: {
      default: '0.1s',
      [media.reducedMotion]: '0s',
    },
    transitionProperty: 'height, font-size',
    transitionTimingFunction: 'ease-in-out',
  },
  preview: {
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    height: '80px',
    overflow: 'hidden',
    width: '100%',
  },
});

type SettingsAppearancePreviewProps = {
  colorScheme: ColorScheme;
};

export const SettingsAppearancePreview = ({
  colorScheme,
}: SettingsAppearancePreviewProps) => {
  const segments = colorScheme === 'System' ? ['Light', 'Dark'] : [colorScheme];

  return (
    <div aria-hidden {...stylex.props(styles.preview)}>
      {segments.map((segment) => {
        const grayScale =
          segment === 'Dark' ? GRAY_SCALE_DARK : GRAY_SCALE_LIGHT;

        return (
          <div
            key={segment}
            {...stylex.props(styles.segment)}
            style={
              {
                '--appearance-preview-background': grayScale.gray4,
                '--appearance-preview-border': grayScale.gray5,
                '--appearance-preview-content-background': grayScale.gray1,
                '--appearance-preview-content-color': grayScale.gray12,
              } as CSSProperties
            }
          >
            <div {...stylex.props(styles.content)}>Aa</div>
          </div>
        );
      })}
    </div>
  );
};
