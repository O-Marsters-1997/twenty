import { SidePanelPageComponentInstanceContext } from '@/side-panel/states/contexts/SidePanelPageComponentInstanceContext';
import { useContextStoreObjectMetadataItemOrThrow } from '@/context-store/hooks/useContextStoreObjectMetadataItemOrThrow';

import { UpdateMultipleRecordsContainer } from '@/object-record/record-update-multiple/components/UpdateMultipleRecordsContainer';
import { useComponentInstanceStateContext } from '@/ui/utilities/state/component-state/hooks/useComponentInstanceStateContext';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  sidePanelRecord: {
    height: '100%',
  },
});

export const SidePanelUpdateMultipleRecords = () => {
  const sidePanelPageInstanceId = useComponentInstanceStateContext(
    SidePanelPageComponentInstanceContext,
  )?.instanceId;

  if (!sidePanelPageInstanceId) {
    throw new Error('Command menu page instance id is not defined');
  }

  const { objectMetadataItem } = useContextStoreObjectMetadataItemOrThrow(
    sidePanelPageInstanceId,
  );

  return (
    <div {...stylex.props(styles.sidePanelRecord)}>
      <UpdateMultipleRecordsContainer
        objectNameSingular={objectMetadataItem.nameSingular}
        contextStoreInstanceId={sidePanelPageInstanceId}
      />
    </div>
  );
};
