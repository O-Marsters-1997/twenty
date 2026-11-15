import { useLingui } from '@lingui/react/macro';
import { AUTO_SELECT_WORKSPACE_DEFAULT_MODEL_ID } from 'twenty-shared/ai';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';

import { useResolvedAiModel } from '@/ai/hooks/useResolvedAiModel';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    color: fontColor['--t-font-color-secondary'],
    minWidth: '0',
    overflow: 'hidden',
  },
});

type CoreAgentModelCellProps = {
  modelId: string;
};

export const CoreAgentModelCell = ({ modelId }: CoreAgentModelCellProps) => {
  const { t } = useLingui();
  const resolvedModel = useResolvedAiModel(modelId);

  const fallbackLabel =
    modelId === AUTO_SELECT_WORKSPACE_DEFAULT_MODEL_ID
      ? t`Workspace default`
      : modelId;

  return (
    <div {...stylex.props(styles.container)}>
      <OverflowingTextWithTooltip
        text={resolvedModel?.label ?? fallbackLabel}
      />
    </div>
  );
};
