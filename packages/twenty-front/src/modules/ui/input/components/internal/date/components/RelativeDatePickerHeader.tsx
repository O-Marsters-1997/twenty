import { Select } from '@/ui/input/components/Select';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { RelativeDatePickerCalendarNavigation } from '@/ui/input/components/internal/date/components/RelativeDatePickerCalendarNavigation';
import { RELATIVE_DATE_DIRECTION_SELECT_OPTIONS } from '@/ui/input/components/internal/date/constants/RelativeDateDirectionSelectOptions';
import { RELATIVE_DATETIME_UNITS } from '@/ui/input/components/internal/date/constants/RelativeDateTimeUnits';
import { RELATIVE_DATE_UNITS } from '@/ui/input/components/internal/date/constants/RelativeDateUnits';

import { plural, t } from '@lingui/core/macro';
import { useState } from 'react';
import { type Nullable } from 'twenty-shared/types';
import {
  assertUnreachable,
  isDefined,
  relativeDateFilterSchema,
  type RelativeDateFilter,
  type RelativeDateFilterDirection,
  type RelativeDateFilterUnit,
} from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
    paddingBottom: 0,
  },
  containerPadded: {
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  controlsRow: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
});

type RelativeDatePickerHeaderProps = {
  instanceId: string;
  direction: RelativeDateFilterDirection;
  amount?: Nullable<number>;
  unit: RelativeDateFilterUnit;
  onChange?: (value: RelativeDateFilter) => void;
  isFormField?: boolean;
  readonly?: boolean;
  unitDropdownWidth?: number;
  allowIntraDayUnits?: boolean;
  calendarMonthDate?: Date;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  prevMonthButtonDisabled?: boolean;
  nextMonthButtonDisabled?: boolean;
};

export const RelativeDatePickerHeader = ({
  instanceId,
  direction,
  unit,
  amount,
  isFormField,
  onChange,
  readonly,
  unitDropdownWidth,
  allowIntraDayUnits,
  calendarMonthDate,
  onPreviousMonth,
  onNextMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: RelativeDatePickerHeaderProps) => {
  const amountString = amount?.toString() ?? '';

  const amountTextValue = direction === 'THIS' ? '' : amountString;
  const amountInputPlaceholder = direction === 'THIS' ? '-' : t`Number`;

  const [draftAmountValue, setDraftAmountValue] = useState(amountTextValue);

  const isUnitPlural = isDefined(amount) && amount > 1 && direction !== 'THIS';
  const unitCount = isUnitPlural ? 2 : 1;

  const getUnitLabel = (unitToLabel: RelativeDateFilterUnit): string => {
    switch (unitToLabel) {
      case 'SECOND':
        return plural(unitCount, { one: 'Second', other: 'Seconds' });
      case 'MINUTE':
        return plural(unitCount, { one: 'Minute', other: 'Minutes' });
      case 'HOUR':
        return plural(unitCount, { one: 'Hour', other: 'Hours' });
      case 'DAY':
        return plural(unitCount, { one: 'Day', other: 'Days' });
      case 'WEEK':
        return plural(unitCount, { one: 'Week', other: 'Weeks' });
      case 'MONTH':
        return plural(unitCount, { one: 'Month', other: 'Months' });
      case 'QUARTER':
        return plural(unitCount, { one: 'Quarter', other: 'Quarters' });
      case 'YEAR':
        return plural(unitCount, { one: 'Year', other: 'Years' });
      default:
        return assertUnreachable(unitToLabel);
    }
  };

  const unitOptionsSource = allowIntraDayUnits
    ? RELATIVE_DATETIME_UNITS
    : RELATIVE_DATE_UNITS;
  const unitSelectOptions = unitOptionsSource.map((unitOption) => ({
    value: unitOption,
    label: getUnitLabel(unitOption),
  }));

  return (
    <div
      {...stylex.props(
        styles.container,
        !isFormField && styles.containerPadded,
      )}
    >
      <div {...stylex.props(styles.controlsRow)}>
        <Select
          dropdownId={`direction-select-${instanceId}`}
          value={direction}
          onChange={(newDirection) => {
            if (amount === undefined && newDirection !== 'THIS') {
              return;
            }

            if (draftAmountValue === '') {
              setDraftAmountValue('1');
            }

            if (newDirection === 'THIS') {
              setDraftAmountValue('');
            }

            onChange?.({
              direction: newDirection,
              amount: amount,
              unit: unit,
            });
          }}
          options={RELATIVE_DATE_DIRECTION_SELECT_OPTIONS}
          fullWidth
          disabled={readonly}
        />
        <SettingsTextInput
          instanceId={`relative-date-picker-amount-${instanceId}`}
          width={50}
          value={draftAmountValue}
          onChange={(text) => {
            const amountString = text.replace(/[^0-9]|^0+/g, '');
            setDraftAmountValue(amountString);

            const amount = parseInt(amountString);

            const valueParts = {
              direction,
              amount,
              unit,
            };

            if (
              relativeDateFilterSchema.safeParse(valueParts).success === true
            ) {
              onChange?.(valueParts);
            }
          }}
          placeholder={amountInputPlaceholder}
          disabled={direction === 'THIS' || readonly}
        />
        <Select
          dropdownId={`unit-select-${instanceId}`}
          value={unit}
          onChange={(newUnit) => {
            if (direction !== 'THIS' && amount === undefined) {
              return;
            }

            if (draftAmountValue === '' && direction !== 'THIS') {
              setDraftAmountValue('1');
            }

            onChange?.({
              direction,
              amount: amount,
              unit: newUnit,
            });
          }}
          fullWidth
          options={unitSelectOptions}
          disabled={readonly}
          dropdownWidth={unitDropdownWidth}
        />
      </div>
      {isDefined(calendarMonthDate) &&
        isDefined(onPreviousMonth) &&
        isDefined(onNextMonth) && (
          <RelativeDatePickerCalendarNavigation
            monthLabelDate={calendarMonthDate}
            onPreviousMonth={onPreviousMonth}
            onNextMonth={onNextMonth}
            prevMonthButtonDisabled={prevMonthButtonDisabled ?? false}
            nextMonthButtonDisabled={nextMonthButtonDisabled ?? false}
          />
        )}
    </div>
  );
};
