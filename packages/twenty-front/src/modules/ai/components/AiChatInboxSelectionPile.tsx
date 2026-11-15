
import { AiChatThreadActivityTime } from '@/ai/components/AiChatThreadActivityTime';
import { AiChatThreadAvatar } from '@/ai/components/AiChatThreadAvatar';
import { AiChatThreadSubtitle } from '@/ai/components/AiChatThreadSubtitle';
import { AiChatThreadTitle } from '@/ai/components/AiChatThreadTitle';
import { AI_CHAT_INBOX_SELECTION_PILE_MAX_CARDS } from '@/ai/constants/AiChatInboxSelectionPileMaxCards';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';
import * as stylex from '@stylexjs/stylex';
import { background, borderColor, borderRadius, boxShadow, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  card: (depth: number) => ({
    alignItems: 'flex-start',
    backgroundColor: background['--t-background-primary'],
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxShadow: boxShadow['--t-box-shadow-light'],
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    marginBlock: 0,
    marginInline: `calc(${spacing['--t-spacing-3']} * ${depth})`,
    padding: spacing['--t-spacing-4'],
    textAlign: 'left',
  }),
  cardStacked: {
    marginTop: `calc(-1 * ${spacing['--t-spacing-8']})`,
  },
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
        <div
          key={thread.id}
          {...stylex.props(
            styles.card(pileThreads.length - 1 - index),
            index > 0 && styles.cardStacked,
          )}
        >
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
        </div>
      ))}
    </div>
  );
};
