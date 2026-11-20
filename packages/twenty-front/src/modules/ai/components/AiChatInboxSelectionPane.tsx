import { plural } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { Key } from 'ts-key-enum';
import { Button } from 'twenty-ui/primitives/input';

import { AiChatInboxSelectionPile } from '@/ai/components/AiChatInboxSelectionPile';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';
import { useResetRecordSelection } from '@/object-record/record-selection/hooks/useResetRecordSelection';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { useGlobalHotkeys } from '@/ui/utilities/hotkey/hooks/useGlobalHotkeys';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  selection: {
    gap: spacing['--t-spacing-8'],
    paddingBlock: spacing['--t-spacing-10'],
    paddingInline: spacing['--t-spacing-4'],
    boxSizing: 'border-box',
  },
  buttons: {
    gap: spacing['--t-spacing-2'],
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});

type AiChatInboxSelectionPaneProps = {
  selectedThreads: AgentChatThreadRecord[];
};

export const AiChatInboxSelectionPane = ({
  selectedThreads,
}: AiChatInboxSelectionPaneProps) => {
  const { t } = useLingui();
  const { resetRecordSelection } = useResetRecordSelection();
  const { openSidePanelMenu } = useSidePanelMenu();

  useGlobalHotkeys({
    keys: [Key.Escape],
    callback: resetRecordSelection,
    containsModifier: false,
    dependencies: [resetRecordSelection],
  });

  return (
    <PageCardLayout
      header={
        <PageCardHeader
          title={plural(selectedThreads.length, {
            one: '# chat',
            other: '# chats',
          })}
        />
      }
    >
      <EmptyState.Root {...stylex.props(styles.selection)}>
        <AiChatInboxSelectionPile threads={selectedThreads} />
        <EmptyState.Content>
          <EmptyState.Title>
            {plural(selectedThreads.length, {
              one: '# chat selected',
              other: '# chats selected',
            })}
          </EmptyState.Title>
          <div {...stylex.props(styles.buttons)}>
            <Button
              size="sm"
              variant="outline"
              shortcut={['Esc']}
              onClick={resetRecordSelection}
            >
              {t`Clear selection`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              shortcut={['Mod', 'K']}
              onClick={openSidePanelMenu}
            >
              {t`All actions`}
            </Button>
          </div>
        </EmptyState.Content>
      </EmptyState.Root>
    </PageCardLayout>
  );
};
