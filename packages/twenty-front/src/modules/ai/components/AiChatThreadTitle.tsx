import { useLingui } from '@lingui/react/macro';
import { isNonEmptyString } from 'twenty-shared/utils';
import { VisuallyHidden } from 'twenty-ui/primitives/accessibility';

import { useIsAgentChatThreadShownAsUnread } from '@/ai/hooks/useIsAgentChatThreadShownAsUnread';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  title: {
    color: fontColor['--t-font-color-secondary'],
    flex: '1',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleUnread: {
    color: fontColor['--t-font-color-primary'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
});

type AiChatThreadTitleProps = {
  thread: AgentChatThreadRecord;
};

export const AiChatThreadTitle = ({ thread }: AiChatThreadTitleProps) => {
  const { t } = useLingui();
  const isUnread = useIsAgentChatThreadShownAsUnread(thread);

  return (
    <div {...stylex.props(styles.title, isUnread && styles.titleUnread)}>
      {isNonEmptyString(thread.title) ? thread.title : t`Untitled`}
      {isUnread && <VisuallyHidden>{t`, unread`}</VisuallyHidden>}
    </div>
  );
};
