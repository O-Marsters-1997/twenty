import { InformationBanner } from '@/information-banner/components/InformationBanner';
import { useRestoreManyRecords } from '@/object-record/hooks/useRestoreManyRecords';
import { t } from '@lingui/core/macro';
import { IconRefresh } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  informationBannerDeletedRecord: {
    position: 'relative',
    height: { default: '40px', ':empty': '0' },
  },
});

export const InformationBannerDeletedRecord = ({
  recordId,
  objectNameSingular,
}: {
  recordId: string;
  objectNameSingular: string;
}) => {
  const { restoreManyRecords } = useRestoreManyRecords({
    objectNameSingular,
  });

  return (
    <div {...stylex.props(styles.informationBannerDeletedRecord)}>
      <InformationBanner
        componentInstanceId="information-banner-deleted-record"
        status="error"
        message={t`This record has been deleted`}
        buttonTitle={t`Restore`}
        buttonIcon={IconRefresh}
        buttonOnClick={() => restoreManyRecords({ idsToRestore: [recordId] })}
      />
    </div>
  );
};
