import { recordTableLayout } from '../../constants/recordTableLayout.stylex';
import { useAggregateRecordsForRecordTableColumnFooter } from '@/object-record/record-table/record-table-footer/hooks/useAggregateRecordsForRecordTableColumnFooter';
import { Trans } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  valueContainer: {
    gap: 4,
    paddingBlock: 0,
    paddingInline: 8,
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    scrollbarWidth: 'none',
    whiteSpace: 'nowrap',
    height: recordTableLayout.rowHeight,
    overflowX: 'auto',
    '::-webkit-scrollbar': {
      display: 'none',
    },
  },
  text: {
    gap: '4px',
    overflow: 'hidden',
    alignItems: 'center',
    display: 'flex',
    flexGrow: '1',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    zIndex: '1',
    height: '20px',
    paddingLeft: spacing['--t-spacing-2'],
  },
  value: {
    color: fontColor['--t-font-color-primary'],
    maxWidth: '100%',
  },
});

export const RecordTableColumnAggregateFooterValue = ({
  dropdownId,
  fieldMetadataId,
}: {
  dropdownId: string;
  fieldMetadataId: string;
}) => {
  const sanitizedId = `tooltip-${dropdownId.replace(/[^a-zA-Z0-9-_]/g, '-')}`;

  const { aggregateValue, aggregateLabel, isLoading } =
    useAggregateRecordsForRecordTableColumnFooter(fieldMetadataId);

  return (
    <>
      {isDefined(aggregateValue) || isLoading ? (
        <div {...stylex.props(styles.valueContainer)}>
          {isLoading ? (
            <></>
          ) : (
            <>
              <OverflowingTextWithTooltip text={aggregateLabel} />
              <div {...stylex.props(styles.value)}>{aggregateValue}</div>
            </>
          )}
        </div>
      ) : (
        <span id={sanitizedId} {...stylex.props(styles.text)}>
          <Trans>Calculate</Trans>
        </span>
      )}
    </>
  );
};
