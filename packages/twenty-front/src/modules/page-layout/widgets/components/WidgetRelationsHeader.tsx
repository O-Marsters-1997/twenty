import { RecordTargetsInlineCell } from '@/object-record/record-field/ui/components/RecordTargetsInlineCell';
import { useObjectMorphJunctionConfig } from '@/object-record/record-field/ui/hooks/useObjectMorphJunctionConfig';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useWorkspaceSurface } from '@/ui/layout/hooks/useWorkspaceSurface';
import { SidePanelProvider } from '@/ui/layout/side-panel/contexts/SidePanelContext';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { border, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: border['--t-border-color-light'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    width: '100%',
  },
});

export const WidgetRelationsHeader = () => {
  const targetRecord = useTargetRecord();
  const isInSidePanel = useWorkspaceSurface().type === 'side-panel';

  const junctionConfig = useObjectMorphJunctionConfig({
    objectNameSingular: targetRecord.targetObjectNameSingular,
  });

  if (!isDefined(junctionConfig)) {
    return null;
  }

  return (
    <SidePanelProvider value={{ isInSidePanel }}>
      <div {...stylex.props(styles.container)}>
        <RecordTargetsInlineCell
          objectNameSingular={targetRecord.targetObjectNameSingular}
          recordId={targetRecord.id}
          instanceIdPrefix={`widget-relations-header${isInSidePanel ? '-side-panel' : ''}`}
          showLabel
        />
      </div>
    </SidePanelProvider>
  );
};
