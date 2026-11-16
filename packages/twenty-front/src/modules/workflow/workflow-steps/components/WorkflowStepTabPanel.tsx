import { type ReactNode } from 'react';
import { Tabs } from 'twenty-ui/primitives/navigation';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0',
  },
});

type WorkflowStepTabPanelProps = {
  value: string;
  children: ReactNode;
};

export const WorkflowStepTabPanel = ({
  value,
  children,
}: WorkflowStepTabPanelProps) => (
  <Tabs.Panel value={value} render={<div {...stylex.props(styles.panel)} />}>
    {children}
  </Tabs.Panel>
);
