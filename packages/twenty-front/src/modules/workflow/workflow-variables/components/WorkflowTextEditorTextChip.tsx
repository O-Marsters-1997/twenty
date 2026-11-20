import { BaseChip } from '@/ui/input/components/BaseChip';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  wrapper: {
    paddingInline: spacing['--t-spacing-0_5'],
    display: 'inline-block',
    whiteSpace: 'nowrap',
  },
});

type WorkflowTextEditorTextChipProps = NodeViewProps;

export const WorkflowTextEditorTextChip = ({
  deleteNode,
  node,
  editor,
}: WorkflowTextEditorTextChipProps) => {
  const text = node.attrs.text as string;

  return (
    <NodeViewWrapper as="span" {...stylex.props(styles.wrapper)}>
      <BaseChip
        label={text}
        onRemove={editor.isEditable ? deleteNode : undefined}
      />
    </NodeViewWrapper>
  );
};
