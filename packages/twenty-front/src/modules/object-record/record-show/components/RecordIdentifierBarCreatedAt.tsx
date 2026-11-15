import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { StyledHeaderIdentifierLabel } from '@/ui/layout/page/components/StyledHeaderIdentifierLabel';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { Trans } from '@lingui/react/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { useId } from 'react';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import {
  beautifyExactDateTime,
  beautifyPastDateRelativeToNow,
} from '~/utils/date-utils';

const styles = stylex.create({
  createdAt: {
    cursor: 'pointer',
  },
});

type RecordIdentifierBarCreatedAtProps = {
  objectRecordId: string;
};

export const RecordIdentifierBarCreatedAt = ({
  objectRecordId,
}: RecordIdentifierBarCreatedAtProps) => {
  const recordCreatedAt = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    { recordId: objectRecordId, fieldName: 'createdAt' },
  );
  const { localeCatalog } = useAtomStateValue(dateLocaleState);
  const instanceId = useId().replace(/:/g, '');

  if (!isNonEmptyString(recordCreatedAt)) {
    return null;
  }

  const createdAtElementId = `record-identifier-bar-created-at-${instanceId}`;
  const beautifiedCreatedAt = beautifyPastDateRelativeToNow(
    recordCreatedAt,
    localeCatalog,
  );

  return (
    <Tooltip
      delay={TooltipDelay.mediumDelay}
      content={beautifyExactDateTime(recordCreatedAt)}
      side="left"
    >
      <StyledHeaderIdentifierLabel
        id={createdAtElementId}
        {...stylex.props(styles.createdAt)}
      >
        <Trans>Created {beautifiedCreatedAt}</Trans>
      </StyledHeaderIdentifierLabel>
    </Tooltip>
  );
};
