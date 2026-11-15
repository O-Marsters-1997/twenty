import { styled } from '@linaria/react';
import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';

import { StyledAiChatAskStatusMessage } from '@/ai/components/AiChatAskStyledComponents';
import { ShimmeringText } from '@/ai/components/ShimmeringText';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledContainer = styled.div`
  align-items: flex-start;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  padding: ${themeCssVariables.spacing[1]} 0;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const styles = stylex.create({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-0_5'],
    minWidth: '0',
  },
});

type AiChatAskStatusRowProps = {
  Icon: IconComponent;
  message: ReactNode;
  isShimmering: boolean;
  children?: ReactNode;
};

export const AiChatAskStatusRow = ({
  Icon,
  message,
  isShimmering,
  children,
}: AiChatAskStatusRowProps) => {
  const theme = useTheme();

  const messageElement = (
    <StyledAiChatAskStatusMessage>{message}</StyledAiChatAskStatusMessage>
  );

  return (
    <StyledContainer>
      <Icon size={theme.icon.size.sm} />
      <div {...stylex.props(styles.content)}>
        {isShimmering ? (
          <ShimmeringText>{messageElement}</ShimmeringText>
        ) : (
          messageElement
        )}
        {children}
      </div>
    </StyledContainer>
  );
};
