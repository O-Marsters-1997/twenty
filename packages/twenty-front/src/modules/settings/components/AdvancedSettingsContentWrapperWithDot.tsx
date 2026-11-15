import { styled } from '@linaria/react';
import { IconPoint } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';

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
});
type DotPosition = 'top' | 'centered';

type AdvancedSettingsContentWrapperWithDotProps = {
  children: React.ReactNode;
  hideDot?: boolean;
  dotPosition?: DotPosition;
};

const StyledDotContainer = styled.div<{ dotPosition: DotPosition }>`
  align-items: ${({ dotPosition }) =>
    dotPosition === 'top' ? 'stretch' : 'center'};
  display: flex;
  height: 100%;
  left: calc(-1 * ${themeCssVariables.spacing[5]});

  position: absolute;
  top: ${({ dotPosition }) => (dotPosition === 'top' ? '0' : 'auto')};
`;

export const AdvancedSettingsContentWrapperWithDot = ({
  children,
  hideDot = false,
  dotPosition = 'centered',
}: AdvancedSettingsContentWrapperWithDotProps) => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.wrapper)}>
      {!hideDot && (
        <StyledDotContainer dotPosition={dotPosition}>
          <span {...stylex.props(styles.iconPointContainer)}>
            <IconPoint
              size={12}
              color={theme.color.yellow}
              fill={theme.color.yellow}
            />
          </span>
        </StyledDotContainer>
      )}
      {children}
    </div>
  );
};
