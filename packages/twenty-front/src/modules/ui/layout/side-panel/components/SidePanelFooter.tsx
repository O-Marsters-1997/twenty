import { SidePanelFooterWidthContext } from '@/ui/layout/side-panel/contexts/SidePanelFooterWidthContext';
import { NodeDimension } from '@/ui/utilities/dimensions/components/NodeDimension';
import { Fragment, useCallback, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  actionsRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    width: '100%',
  },
  container: {
    background: background['--t-background-secondary'],
    boxSizing: 'border-box',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    bottom: '0',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-2'],
    width: '100%',
  },
});

type SidePanelFooterProps = {
  actions: React.ReactNode[];
};

export const SidePanelFooter = ({ actions }: SidePanelFooterProps) => {
  const [actionsRowWidth, setActionsRowWidth] = useState(0);

  const handleActionsRowDimensionChange = useCallback(
    (dimensions: { width: number; height: number }) => {
      setActionsRowWidth(dimensions.width);
    },
    [],
  );

  return (
    <div {...stylex.props(styles.container)}>
      <SidePanelFooterWidthContext.Provider value={actionsRowWidth}>
        <NodeDimension
          className={stylex.props(styles.actionsRow).className}
          onDimensionChange={handleActionsRowDimensionChange}
        >
          {actions.map((action, index) => (
            <Fragment key={index}>{action}</Fragment>
          ))}
        </NodeDimension>
      </SidePanelFooterWidthContext.Provider>
    </div>
  );
};
