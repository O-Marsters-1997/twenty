import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { CoreObjectNameSingular } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IconUserPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';

import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { FormSingleRecordPicker } from '@/object-record/record-field/ui/form-types/components/FormSingleRecordPicker';
import { useSidePanelMenu } from '@/side-panel/hooks/useSidePanelMenu';
import { useAddPeopleToMessageList } from '@/side-panel/pages/add-to-message-list/hooks/useAddPeopleToMessageList';
import { addToMessageListPersonFilterComponentState } from '@/side-panel/pages/add-to-message-list/states/addToMessageListPersonFilterComponentState';
import { SidePanelFooter } from '@/ui/layout/side-panel/components/SidePanelFooter';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  content: {
    flex: '1',
    gap: spacing['--t-spacing-4'],
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingTop: spacing['--t-spacing-4'],
  },
});

export const SidePanelAddToMessageListPage = () => {
  const addToMessageListPersonFilter = useAtomComponentStateValue(
    addToMessageListPersonFilterComponentState,
  );

  const [messageListId, setMessageListId] = useState<string | null>(null);

  const { t } = useLingui();
  const { closeSidePanelMenu } = useSidePanelMenu();

  const { createOneRecord: createOneMessageList } = useCreateOneRecord({
    objectNameSingular: CoreObjectNameSingular.MessageList,
  });

  const { addPeopleToMessageList, isAdding } = useAddPeopleToMessageList({
    messageListId,
    personFilter: addToMessageListPersonFilter,
    onCompleted: closeSidePanelMenu,
  });

  const handleCreateMessageList = async (searchInput?: string) => {
    const createdMessageList = await createOneMessageList({
      name: searchInput ?? '',
    });

    setMessageListId(createdMessageList.id);
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.content)}>
        <FormSingleRecordPicker
          label={t`List`}
          defaultValue={messageListId}
          objectNameSingulars={[CoreObjectNameSingular.MessageList]}
          onChange={setMessageListId}
          onClear={() => setMessageListId(null)}
          onCreate={handleCreateMessageList}
          disabled={isAdding}
        />
      </div>
      <SidePanelFooter
        actions={[
          <Button
            key="cancel"
            size="sm"
            variant="outline"
            onClick={closeSidePanelMenu}
          >{t`Cancel`}</Button>,
          <Button
            key="add-to-list"
            size="sm"
            startIcon={<IconUserPlus />}
            loading={isAdding}
            disabled={isAdding || !isDefined(messageListId)}
            onClick={addPeopleToMessageList}
            variant="solid"
            color="accent"
          >{t`Add to List`}</Button>,
        ]}
      />
    </div>
  );
};
