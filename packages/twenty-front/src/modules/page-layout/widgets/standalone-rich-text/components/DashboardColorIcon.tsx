import { type BlockNoteColor } from '@/page-layout/widgets/standalone-rich-text/types/BlockNoteColor';
import { useTheme } from 'twenty-ui/theme';
import { borderRadius, fontWeight } from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
type DashboardColorIconProps = {
  textColor?: BlockNoteColor;
  backgroundColor?: BlockNoteColor;
};

export const DashboardColorIcon = ({
  textColor,
  backgroundColor,
}: DashboardColorIconProps) => {
  const theme = useTheme();

  const getThemeColorForTextColor = (color: BlockNoteColor): string => {
    if (color === 'default') {
      return 'inherit';
    }
    return (
      (theme.color as unknown as Record<string, string>)[color] ?? 'inherit'
    );
  };

  const getThemeColorForBackgroundColor = (color: BlockNoteColor): string => {
    if (color === 'default') {
      return 'transparent';
    }

    const backgroundColorMap: Record<
      Exclude<BlockNoteColor, 'default'>,
      string
    > = {
      gray: theme.color.gray3,
      brown: theme.color.brown3,
      red: theme.color.red3,
      orange: theme.color.orange3,
      yellow: theme.color.yellow3,
      green: theme.color.green3,
      blue: theme.color.blue3,
      purple: theme.color.purple3,
      pink: theme.color.pink3,
    };

    return backgroundColorMap[color];
  };

  return (
    <div
      {...stylex.props(
        styles.icon,
        styles.colors(
          textColor ? getThemeColorForTextColor(textColor) : 'inherit',
          backgroundColor
            ? getThemeColorForBackgroundColor(backgroundColor)
            : 'transparent',
        ),
      )}
    >
      A
    </div>
  );
};

const styles = stylex.create({
  icon: {
    borderRadius: borderRadius['--t-border-radius-xs'],
    fontSize: 12,
    fontWeight: fontWeight['--t-font-weight-medium'],
    lineHeight: '16px',
    pointerEvents: 'none',
    textAlign: 'center',
    height: 16,
    width: 16,
  },
  colors: (textColor: string, backgroundColor: string) => ({
    backgroundColor,
    color: textColor,
  }),
});
