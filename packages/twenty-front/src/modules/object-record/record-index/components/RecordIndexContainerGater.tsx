import { RecordIndexContextProvider } from '@/object-record/record-index/contexts/RecordIndexContext';

import { getCommandMenuIdFromRecordIndexId } from '@/command-menu-item/utils/getCommandMenuIdFromRecordIndexId';
import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { RecordIndexViewBar } from '@/object-record/record-index/components/RecordIndexViewBar';
import { RecordComponentInstanceContextsWrapper } from '@/object-record/components/RecordComponentInstanceContextsWrapper';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { lastShowPageRecordIdState } from '@/object-record/record-field/ui/states/lastShowPageRecordId';
import { RecordIndexContainer } from '@/object-record/record-index/components/RecordIndexContainer';
import { RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect } from '@/object-record/record-index/components/RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect';
import { RecordIndexEmptyStateNotShared } from '@/object-record/record-index/components/RecordIndexEmptyStateNotShared';
import { RecordIndexLoadBaseOnContextStoreEffect } from '@/object-record/record-index/components/RecordIndexLoadBaseOnContextStoreEffect';
import { RecordIndexPageHeader } from '@/object-record/record-index/components/RecordIndexPageHeader';
import { RecordIndexViewFieldsSSESyncEffect } from '@/object-record/record-index/components/RecordIndexViewFieldsSSESyncEffect';
import { useHandleIndexIdentifierClick } from '@/object-record/record-index/hooks/useHandleIndexIdentifierClick';
import { useRecordIndexFieldMetadataDerivedStates } from '@/object-record/record-index/hooks/useRecordIndexFieldMetadataDerivedStates';
import { useRecordIndexIdFromCurrentContextStore } from '@/object-record/record-index/hooks/useRecordIndexIdFromCurrentContextStore';
import { RECORD_INDEX_DRAG_SELECT_BOUNDARY_CLASS } from '@/ui/utilities/drag-select/constants/RecordIndexDragSelectBoundaryClass';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { PageTitle } from '@/ui/utilities/page-title/components/PageTitle';
import { ViewComponentInstanceContext } from '@/views/states/contexts/ViewComponentInstanceContext';
import * as stylex from '@stylexjs/stylex';
import { memo, useCallback } from 'react';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';

const styles = stylex.create({
  indexContainer: {
    flex: '1',
    display: 'flex',
    minHeight: 0,
    width: '100%',
  },
});

export const RecordIndexContainerGater = memo(() => {
  const setLastShowPageRecordId = useSetAtomComponentState(
    lastShowPageRecordIdState,
  );

  const { recordIndexId, objectMetadataItem } =
    useRecordIndexIdFromCurrentContextStore();

  const handleIndexRecordsLoaded = useCallback(() => {
    // TODO: find a better way to reset this state ?
    setLastShowPageRecordId(null);
  }, [setLastShowPageRecordId]);

  const { indexIdentifierUrl } = useHandleIndexIdentifierClick({
    objectMetadataItem,
  });

  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();
  const objectPermissions = getObjectPermissionsForObject(
    objectPermissionsByObjectMetadataId,
    objectMetadataItem.id,
  );

  const hasObjectReadPermissions = objectPermissions.canReadObjectRecords;

  const {
    fieldDefinitionByFieldMetadataItemId,
    fieldMetadataItemByFieldMetadataItemId,
    labelIdentifierFieldMetadataItem,
    recordFieldByFieldMetadataItemId,
  } = useRecordIndexFieldMetadataDerivedStates(
    objectMetadataItem,
    recordIndexId,
  );

  const indexContainerProps = stylex.props(styles.indexContainer);

  const indexContent = (
    <div
      className={`${indexContainerProps.className} ${RECORD_INDEX_DRAG_SELECT_BOUNDARY_CLASS}`}
    >
      {hasObjectReadPermissions ? (
        <>
          <RecordIndexContainerContextStoreNumberOfSelectedRecordsEffect />
          <RecordIndexContainer />
        </>
      ) : (
        <RecordIndexEmptyStateNotShared />
      )}
    </div>
  );

  return (
    <RecordIndexContextProvider
      value={{
        objectPermissionsByObjectMetadataId,
        recordIndexId,
        viewBarInstanceId: recordIndexId,
        objectNamePlural: objectMetadataItem.namePlural,
        objectNameSingular: objectMetadataItem.nameSingular,
        objectMetadataItem,
        onIndexRecordsLoaded: handleIndexRecordsLoaded,
        indexIdentifierUrl,
        recordFieldByFieldMetadataItemId,
        labelIdentifierFieldMetadataItem,
        fieldMetadataItemByFieldMetadataItemId,
        fieldDefinitionByFieldMetadataItemId,
      }}
    >
      <ViewComponentInstanceContext.Provider
        value={{ instanceId: recordIndexId }}
      >
        <RecordComponentInstanceContextsWrapper
          componentInstanceId={recordIndexId}
        >
          <CommandMenuComponentInstanceContext.Provider
            value={{
              instanceId: getCommandMenuIdFromRecordIndexId(recordIndexId),
            }}
          >
            <PageTitle title={objectMetadataItem.labelPlural} />
            <PageCardLayout
              header={<RecordIndexPageHeader />}
              secondaryBar={hasObjectReadPermissions && <RecordIndexViewBar />}
            >
              {indexContent}
            </PageCardLayout>
          </CommandMenuComponentInstanceContext.Provider>
        </RecordComponentInstanceContextsWrapper>
        <RecordIndexLoadBaseOnContextStoreEffect />
        <RecordIndexViewFieldsSSESyncEffect />
      </ViewComponentInstanceContext.Provider>
    </RecordIndexContextProvider>
  );
});
