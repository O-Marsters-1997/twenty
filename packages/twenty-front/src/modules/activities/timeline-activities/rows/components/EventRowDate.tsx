import { isNonEmptyString } from '@sniptt/guards';
import { useId } from 'react';

import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { dateLocaleState } from '@/localization/states/dateLocaleState';
import { beautifyPastDateRelativeToNow } from '~/utils/date-utils';
import { formatDateTimeString } from '@/object-record/record-field/ui/utils/formatDateTimeString';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  eventRowDate: {
    display: { default: null, [media.mobile]: 'none' },
    color: fontColor['--t-font-color-tertiary'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
    whiteSpace: 'nowrap',
  },
});

type EventRowDateProps = {
  happensAt?: string;
};

export const EventRowDate = ({ happensAt }: EventRowDateProps) => {
  const { dateFormat, timeFormat, timeZone } = useDateTimeFormat();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);

  const instanceId = useId();
  const dateElementId = `event-row-date-${instanceId.replace(/[^a-zA-Z0-9-_]/g, '-')}`;

  if (!isNonEmptyString(happensAt)) {
    return null;
  }

  const relativeHappensAt = beautifyPastDateRelativeToNow(
    happensAt,
    localeCatalog,
  );
  const exactHappensAt = formatDateTimeString({
    value: happensAt,
    timeZone,
    dateFormat,
    timeFormat,
    localeCatalog,
  });

  return (
    <Tooltip
      content={exactHappensAt}
      delay={TooltipDelay.mediumDelay}
      side="left"
    >
      <div id={dateElementId} tabIndex={0} {...stylex.props(styles.eventRowDate)}>
        {relativeHappensAt}
      </div>
    </Tooltip>
  );
};
