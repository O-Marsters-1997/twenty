import * as stylex from '@stylexjs/stylex';
import { accent, animationDuration, backgroundTransparent, color, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { isDefined } from 'twenty-shared/utils';
import { Banner } from 'twenty-ui/primitives/feedback';
import { IconChevronDown, IconInfoCircle } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

export const UnmatchColumnBanner = ({
  message,
  isExpanded,
  buttonOnClick,
  allMatched,
}: {
  message: string;
  isExpanded: boolean;
  buttonOnClick?: () => void;
  allMatched: boolean;
}) => {
  const theme = useTheme();

  return (
    <Banner
      {...stylex.props(
        styles.banner,
        allMatched ? styles.bannerMatched : styles.bannerUnmatched,
      )}
    >
      <IconInfoCircle
        color={allMatched ? theme.color.blue : theme.font.color.secondary}
        size={theme.icon.size.md}
      />
      {isDefined(buttonOnClick) ? (
        <div
          onClick={buttonOnClick}
          {...stylex.props(styles.clickableContainer)}
        >
          <div
            {...stylex.props(
              styles.text,
              allMatched ? styles.textMatched : styles.textUnmatched,
            )}
          >
            {message}
          </div>
          <div
            {...stylex.props(
              styles.chevronWrapper,
              allMatched ? styles.textMatched : styles.textUnmatched,
              isExpanded && styles.chevronExpanded,
            )}
          >
            <IconChevronDown size={theme.icon.size.md} />
          </div>
        </div>
      ) : (
        <div
          {...stylex.props(
            styles.text,
            allMatched ? styles.textMatched : styles.textUnmatched,
          )}
        >
          {message}
        </div>
      )}
    </Banner>
  );
};

const styles = stylex.create({
  banner: {
    borderRadius: spacing['--t-spacing-2'],
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: '10px',
  },
  bannerMatched: {
    background: accent['--t-accent-secondary'],
  },
  bannerUnmatched: {
    background: backgroundTransparent['--t-background-transparent-light'],
  },
  clickableContainer: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  text: {
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  textMatched: {
    color: color['--t-color-blue'],
  },
  textUnmatched: {
    color: fontColor['--t-font-color-secondary'],
  },
  chevronWrapper: {
    alignItems: 'center',
    cursor: 'pointer',
    display: 'flex',
    transform: 'rotate(0deg)',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'transform',
    transitionTimingFunction: 'ease',
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
});
