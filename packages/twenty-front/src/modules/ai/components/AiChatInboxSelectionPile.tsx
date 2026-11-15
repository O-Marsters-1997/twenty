import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme';

import { AiChatThreadActivityTime } from '@/ai/components/AiChatThreadActivityTime';
import { AiChatThreadAvatar } from '@/ai/components/AiChatThreadAvatar';
import { AiChatThreadSubtitle } from '@/ai/components/AiChatThreadSubtitle';
import { AiChatThreadTitle } from '@/ai/components/AiChatThreadTitle';
import { AI_CHAT_INBOX_SELECTION_PILE_MAX_CARDS } from '@/ai/constants/AiChatInboxSelectionPileMaxCards';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  pile: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '480px',
    width: '100%',
  },
  leading: {
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-0_5'],
    width: spacing['--t-spacing-7'],
  },
  content: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minWidth: '0',
  },
  heading: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    minWidth: '0',
  },
});

// Each card sits a step lower and wider than the one behind it, leaving the
// title of the cards behind in view
const StyledCard = styled.div<{ $depth: number }>`
  align-items: flex-start;
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.light};
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  margin: 0 calc(${themeCssVariables.spacing[3]} * ${({ $depth }) => $depth});
  padding: ${themeCssVariables.spacing[4]};
  text-align: left;

  & + & {
    margin-top: calc(-1 * ${themeCssVariables.spacing[8]});
  }
`;

type AiChatInboxSelectionPileProps = {
  threads: AgentChatThreadRecord[];
};

export const AiChatInboxSelectionPile = ({
  threads,
}: AiChatInboxSelectionPileProps) => {
  const pileThreads = threads.slice(0, AI_CHAT_INBOX_SELECTION_PILE_MAX_CARDS);

  return (
    <div aria-hidden {...stylex.props(styles.pile)}>
      {pileThreads.map((thread, index) => (
        <StyledCard key={thread.id} $depth={pileThreads.length - 1 - index}>
          <div {...stylex.props(styles.leading)}>
            <AiChatThreadAvatar thread={thread} />
          </div>
          <div {...stylex.props(styles.content)}>
            <div {...stylex.props(styles.heading)}>
              <AiChatThreadTitle thread={thread} />
              <AiChatThreadActivityTime thread={thread} />
            </div>
            <AiChatThreadSubtitle thread={thread} />
          </div>
        </StyledCard>
      ))}
    </div>
  );
};
