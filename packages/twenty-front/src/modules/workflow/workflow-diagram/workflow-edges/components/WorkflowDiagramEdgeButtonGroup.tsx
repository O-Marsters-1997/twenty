import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { ButtonGroup } from 'twenty-ui/primitives/input';
import { color } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  root: {
    pointerEvents: 'all',
  },
  selected: {
    backgroundColor: color['--t-color-blue2'],
    borderColor: color['--t-color-blue'],
  },
});

type WorkflowDiagramEdgeButtonGroupProps = {
  children: ReactNode;
  selected?: boolean;
};

export const WorkflowDiagramEdgeButtonGroup = ({
  selected = false,
  children,
}: WorkflowDiagramEdgeButtonGroupProps) => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.root, selected && styles.selected)}>
      <ButtonGroup
        aria-label={t`Workflow connection controls`}
        framed
        attached={false}
        className="nodrag nopan"
      >
        {children}
      </ButtonGroup>
    </div>
  );
};
