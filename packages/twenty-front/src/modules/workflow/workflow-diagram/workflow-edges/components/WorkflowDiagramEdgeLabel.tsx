import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    background: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-strong'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-1'],
    paddingBlock: spacing['--t-spacing-0_5'],
    paddingInline: spacing['--t-spacing-1'],
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
  label: {
    color: fontColor['--t-font-color-light'],
    fontSize: '11px',
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  number: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type WorkflowDiagramEdgeLabelProps = {
  label: string;
  elseIfIndex?: number;
};

export const WorkflowDiagramEdgeLabel = ({
  label,
  elseIfIndex,
}: WorkflowDiagramEdgeLabelProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      {isDefined(elseIfIndex) && (
        <span {...stylex.props(styles.number)}>{elseIfIndex}</span>
      )}
      <div {...stylex.props(styles.label)}>{label}</div>
    </div>
  );
};
