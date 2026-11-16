import { AdvancedFilterRelationValueInputClickableSelect } from '@/object-record/advanced-filter/components/AdvancedFilterRelationValueInputClickableSelect';
import { getAdvancedFilterInputPlaceholderText } from '@/object-record/advanced-filter/utils/getAdvancedFilterInputPlacedholderText';
import { currentRecordFiltersComponentState } from '@/object-record/record-filter/states/currentRecordFiltersComponentState';
import { SelectControl } from '@/ui/input/components/SelectControl';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';

import { isNonEmptyString } from '@sniptt/guards';

import { useFieldMetadataItemById } from '@/object-metadata/hooks/useFieldMetadataItemById';
import { useGetRecordFilterDisplayValue } from '@/object-record/record-filter/hooks/useGetRecordFilterDisplayValue';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

// TODO: factorize this with https://github.com/twentyhq/core-team-issues/issues/752
const styles = stylex.create({
  controlContainer: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    cursor: 'pointer',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-8'],
    maxWidth: '100%',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    textAlign: 'left',
  },
});

type AdvancedFilterValueInputDropdownButtonClickableSelectProps = {
  recordFilterId: string;
};

export const AdvancedFilterValueInputDropdownButtonClickableSelect = ({
  recordFilterId,
}: AdvancedFilterValueInputDropdownButtonClickableSelectProps) => {
  const currentRecordFilters = useAtomComponentStateValue(
    currentRecordFiltersComponentState,
  );

  const { getRecordFilterDisplayValue } = useGetRecordFilterDisplayValue();

  const recordFilter = currentRecordFilters.find(
    (recordFilter) => recordFilter.id === recordFilterId,
  );

  const isDisabled =
    !isDefined(recordFilter?.fieldMetadataId) ||
    !isDefined(recordFilter.operand);

  const shouldUsePlaceholder = !isNonEmptyString(recordFilter?.value);

  const { fieldMetadataItem } = useFieldMetadataItemById(
    recordFilter?.fieldMetadataId ?? '',
  );

  const placeholderText = isDefined(fieldMetadataItem)
    ? getAdvancedFilterInputPlaceholderText(fieldMetadataItem)
    : t`Enter filter`;

  const recordFilterDisplayValue = getRecordFilterDisplayValue(recordFilter);

  const advancedFilterInputText = shouldUsePlaceholder
    ? placeholderText
    : (recordFilterDisplayValue ?? '');

  const isDateTimeType =
    recordFilter?.type === 'DATE' || recordFilter?.type === 'DATE_TIME';

  if (
    recordFilter?.type === 'RELATION' &&
    !shouldUsePlaceholder &&
    isDefined(recordFilter.fieldMetadataId)
  ) {
    return (
      <AdvancedFilterRelationValueInputClickableSelect
        recordFilter={recordFilter}
      />
    );
  }

  return isDateTimeType ? (
    <div {...stylex.props(styles.controlContainer)}>
      {advancedFilterInputText}
    </div>
  ) : (
    <SelectControl
      selectedOption={{
        label: advancedFilterInputText,
        value: null,
        disabled: isDisabled,
      }}
      textAccent={shouldUsePlaceholder ? 'placeholder' : 'default'}
      isDisabled={isDateTimeType}
    />
  );
};
