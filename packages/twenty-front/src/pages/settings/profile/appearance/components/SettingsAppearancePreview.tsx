import { GRAY_SCALE_DARK, GRAY_SCALE_LIGHT } from 'twenty-ui/theme';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import { appearanceRadioMarker } from './SettingsAppearanceOption.stylex';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const RADIO_HOVER = stylex.when.ancestor(
  ':hover:not(:is([data-disabled]))',
  appearanceRadioMarker,
);

const styles = stylex.create({
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
  segment: {
    alignItems: 'flex-end',
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'border-box',
    display: 'flex',
    flex: 1,
    minWidth: '0',
    paddingInlineStart: spacing['--t-spacing-6'],
    paddingTop: spacing['--t-spacing-6'],
  },
  segmentFirst: {
    borderEndStartRadius: borderRadius['--t-border-radius-md'],
    borderStartStartRadius: borderRadius['--t-border-radius-md'],
  },
  segmentLast: {
    borderEndEndRadius: borderRadius['--t-border-radius-md'],
    borderStartEndRadius: borderRadius['--t-border-radius-md'],
  },
  segmentColors: (background: string, border: string) => ({
    backgroundColor: background,
    borderColor: border,
  }),
  content: {
    borderBottomWidth: '0',
    borderInlineEndWidth: '0',
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: '1px',
    borderStartStartRadius: borderRadius['--t-border-radius-md'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    boxSizing: 'border-box',
    flex: 1,
    fontSize: { default: '20px', [RADIO_HOVER]: '22px' },
    height: { default: '56px', [RADIO_HOVER]: '61px' },
    paddingInlineStart: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    transition: {
      default: 'height 0.1s ease-in-out, font-size 0.1s ease-in-out',
      [media.reducedMotion]: 'none',
    },
  },
  contentColors: (background: string, border: string, textColor: string) => ({
    backgroundColor: background,
    borderInlineStartColor: border,
    borderTopColor: border,
    color: textColor,
  }),
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
      {segments.map((segment, index) => {
        const grayScale =
          segment === 'Dark' ? GRAY_SCALE_DARK : GRAY_SCALE_LIGHT;

        return (
          <div
            key={segment}
            {...stylex.props(
              styles.segment,
              index === 0 && styles.segmentFirst,
              index === segments.length - 1 && styles.segmentLast,
              styles.segmentColors(grayScale.gray4, grayScale.gray5),
            )}
          >
            <div
              {...stylex.props(
                styles.content,
                styles.contentColors(
                  grayScale.gray1,
                  grayScale.gray5,
                  grayScale.gray12,
                ),
              )}
            >
              Aa
            </div>
          </div>
        );
      })}
    </div>
  );
};
