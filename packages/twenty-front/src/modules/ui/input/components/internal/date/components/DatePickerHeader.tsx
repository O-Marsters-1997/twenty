import { t } from '@lingui/core/macro';

import { Select } from '@/ui/input/components/Select';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { DatePickerInput } from '@/ui/input/components/internal/date/components/DatePickerInput';
import { getDatePickerDropdownIds } from '@/ui/input/components/internal/date/utils/getDatePickerDropdownIds';
import { getMonthSelectOptions } from '@/ui/input/components/internal/date/utils/getMonthSelectOptions';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { Temporal } from 'temporal-polyfill';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const YEARS_SELECT_OPTIONS = Array.from(
  { length: 200 },
  (_, i) => new Date().getFullYear() + 50 - i,
).map((year) => ({ label: year.toString(), value: year }));

const styles = stylex.create({
  customDatePickerHeader: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
});

type DatePickerHeaderProps = {
  instanceId: string;
  date: string | null;
  onChange?: (date: string | null) => void;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
  onAddMonth: () => void;
  onSubtractMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
  hideInput?: boolean;
};

export const DatePickerHeader = ({
  instanceId,
  date,
  onChange,
  onChangeMonth,
  onChangeYear,
  onAddMonth,
  onSubtractMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  hideInput = false,
}: DatePickerHeaderProps) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const userLocale = currentWorkspaceMember?.locale ?? SOURCE_LOCALE;

  const { monthSelectDropdownId, yearSelectDropdownId } =
    getDatePickerDropdownIds(instanceId);

  const dateParsed = isDefined(date) ? Temporal.PlainDate.from(date) : null;

  return (
    <>
      {!hideInput && <DatePickerInput date={date} onChange={onChange} />}
      <div {...stylex.props(styles.customDatePickerHeader)}>
        <Select
          dropdownId={monthSelectDropdownId}
          options={getMonthSelectOptions(userLocale)}
          onChange={onChangeMonth}
          value={dateParsed?.month}
          fullWidth
        />
        <Select
          dropdownId={yearSelectDropdownId}
          onChange={onChangeYear}
          value={dateParsed?.year}
          options={YEARS_SELECT_OPTIONS}
          fullWidth
        />
        <LightIconButton
          onClick={onSubtractMonth}
          size="md"
          disabled={prevMonthButtonDisabled}
          aria-label={t`Previous`}
        >
          <IconChevronLeft />
        </LightIconButton>
        <LightIconButton
          onClick={onAddMonth}
          size="md"
          disabled={nextMonthButtonDisabled}
          aria-label={t`Next`}
        >
          <IconChevronRight />
        </LightIconButton>
      </div>
    </>
  );
};
