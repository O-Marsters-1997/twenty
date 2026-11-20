import { type ReactNode } from 'react';

import { AiModelTierDropdown } from '@/ai/components/AiModelTierDropdown';
import { AiChatContextUsageButton } from '@/ai/components/internal/AiChatContextUsageButton';
import { aiModelsState } from '@/client-config/states/aiModelsState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  actionsRow: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftActions: {
    gap: spacing['--t-spacing-0_5'],
    alignItems: 'center',
    display: 'flex',
  },
  rightActions: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
});

type AiChatComposerActionsRowProps = {
  leftActions?: ReactNode;
  modelTierDropdownId: string;
  sendButton: ReactNode;
};

export const AiChatComposerActionsRow = ({
  leftActions,
  modelTierDropdownId,
  sendButton,
}: AiChatComposerActionsRowProps) => {
  const aiModels = useAtomStateValue(aiModelsState);

  return (
    <div {...stylex.props(styles.actionsRow)}>
      <div {...stylex.props(styles.leftActions)}>
        {leftActions}
        <AiChatContextUsageButton />
      </div>
      <div {...stylex.props(styles.rightActions)}>
        <AiModelTierDropdown
          dropdownId={modelTierDropdownId}
          disabled={aiModels.length === 0}
        />
        {sendButton}
      </div>
    </div>
  );
};
