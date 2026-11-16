import { VariableChip } from '@/object-record/record-field/ui/form-types/components/VariableChip';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  wrapper: {
    display: 'inline-block',
    paddingInline: spacing['--t-spacing-0_5'],
    whiteSpace: 'nowrap',
  },
});

type WorkflowTextEditorVariableChipProps = NodeViewProps;

export const WorkflowTextEditorVariableChip = ({
  deleteNode,
  node,
  editor,
}: WorkflowTextEditorVariableChipProps) => {
  const attrs = node.attrs as {
    variable: string;
  };

  return (
    <NodeViewWrapper as="span" {...stylex.props(styles.wrapper)}>
      <VariableChip
        rawVariableName={attrs.variable}
        onRemove={editor.isEditable ? deleteNode : undefined}
      />
    </NodeViewWrapper>
  );
};
