import * as stylex from '@stylexjs/stylex';
import { IconPoint } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  iconPointContainer: {
    alignItems: 'center',
    display: 'flex',
    marginRight: '0',
  },
  dotContainer: {
    display: 'flex',
    position: 'absolute',
    height: '100%',
    left: `calc(-1 * ${spacing['--t-spacing-5']})`,
  },
  dotContainerTop: {
    alignItems: 'stretch',
    top: 0,
  },
  dotContainerCentered: {
    alignItems: 'center',
    top: 'auto',
  },
});

type DotPosition = 'top' | 'centered';

type AdvancedSettingsContentWrapperWithDotProps = {
  children: React.ReactNode;
  hideDot?: boolean;
  dotPosition?: DotPosition;
};

export const AdvancedSettingsContentWrapperWithDot = ({
  children,
  hideDot = false,
  dotPosition = 'centered',
}: AdvancedSettingsContentWrapperWithDotProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.wrapper)}>
      {!hideDot && (
        <div
          {...stylex.props(
            styles.dotContainer,
            dotPosition === 'top'
              ? styles.dotContainerTop
              : styles.dotContainerCentered,
          )}
        >
          <span {...stylex.props(styles.iconPointContainer)}>
            <IconPoint
              size={12}
              color={theme.color.yellow}
              fill={theme.color.yellow}
            />
          </span>
        </div>
      )}
      {children}
    </div>
  );
};
