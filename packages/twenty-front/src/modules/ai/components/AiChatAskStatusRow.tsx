import { type ReactNode } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { aiChatAskStyles } from '@/ai/components/AiChatAskStyledComponents';
import { ShimmeringText } from '@/ai/components/ShimmeringText';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'flex-start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: 0,
  },
  icon: {
    display: 'flex',
    flexShrink: 0,
    marginTop: '1px',
  },
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
    <span {...stylex.props(aiChatAskStyles.statusMessage)}>{message}</span>
  );

  return (
    <div {...stylex.props(styles.container)}>
      <span {...stylex.props(styles.icon)}>
        <Icon size={theme.icon.size.sm} />
      </span>
      <div {...stylex.props(styles.content)}>
        {isShimmering ? (
          <ShimmeringText>{messageElement}</ShimmeringText>
        ) : (
          messageElement
        )}
        {children}
      </div>
    </div>
  );
};
