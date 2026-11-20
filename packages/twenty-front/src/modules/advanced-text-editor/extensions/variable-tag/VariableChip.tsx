import { BaseChip } from '@/ui/input/components/BaseChip';
import { t } from '@lingui/core/macro';
import * as stylex from '@stylexjs/stylex';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  wrapper: {
    paddingInline: spacing['--t-spacing-0_5'],
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
});

type VariableChipProps = Pick<NodeViewProps, 'deleteNode' | 'editor'> & {
  label: string;
  title?: string;
};

export const VariableChip = ({
  deleteNode,
  editor,
  label,
  title,
}: VariableChipProps) => (
  <NodeViewWrapper as="span" {...stylex.props(styles.wrapper)}>
    <BaseChip
      label={label}
      title={title}
      onRemove={editor.isEditable ? deleteNode : undefined}
      removeAriaLabel={t`Remove variable`}
    />
  </NodeViewWrapper>
);
