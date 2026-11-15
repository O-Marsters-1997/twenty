import { useLingui } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';

import { RecordChip } from '@/object-record/components/RecordChip';
import { AiChatToolCallApprovalRecordStoreEffect } from '@/ai/components/internal/AiChatToolCallApprovalRecordStoreEffect';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  recordRow: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: fontSize['--t-font-size-md'],
    gap: spacing['--t-spacing-1'],
  },
  missingRecord: {
    color: fontColor['--t-font-color-danger'],
  },
});

type AiChatToolCallApprovalRecordProps = {
  objectNameSingular: string;
  recordId: string;
  isDeletion: boolean;
};

export const AiChatToolCallApprovalRecord = ({
  objectNameSingular,
  recordId,
  isDeletion,
}: AiChatToolCallApprovalRecordProps) => {
  const { t } = useLingui();
  const { record, loading, error } = useFindOneRecord({
    objectNameSingular,
    objectRecordId: recordId,
  });

  if (loading) {
    return null;
  }

  return (
    <div {...stylex.props(styles.recordRow)}>
      {isDeletion ? t`This record will be deleted:` : t`Record:`}
      {isDefined(record) ? (
        <>
          <AiChatToolCallApprovalRecordStoreEffect record={record} />
          <RecordChip objectNameSingular={objectNameSingular} record={record} />
        </>
      ) : (
        // approving still runs the call, which then fails, so the person must see why
        <span {...stylex.props(styles.missingRecord)}>
          {isDefined(error)
            ? t`This record could not be loaded.`
            : t`This record no longer exists or you cannot see it.`}
        </span>
      )}
    </div>
  );
};
