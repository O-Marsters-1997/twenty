import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useEffect } from 'react';
import { useIMask } from 'react-imask';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useDateTimeFormat } from '@/localization/hooks/useDateTimeFormat';
import { Select } from '@/ui/input/components/Select';
import { DateTimePickerInput } from '@/ui/input/components/internal/date/components/DateTimePickerInput';
import { useTimeInput } from '@/ui/input/components/internal/date/hooks/useTimeInput';
import { getDatePickerDropdownIds } from '@/ui/input/components/internal/date/utils/getDatePickerDropdownIds';
import { getMonthSelectOptions } from '@/ui/input/components/internal/date/utils/getMonthSelectOptions';
import { getTimeBlocks } from '@/ui/input/components/internal/date/utils/getTimeBlocks';
import { getTimeMask } from '@/ui/input/components/internal/date/utils/getTimeMask';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { t } from '@lingui/core/macro';
import { type Temporal } from 'temporal-polyfill';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
} from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderColor, borderRadius, font, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const YEARS_SELECT_OPTIONS = Array.from(
  { length: 200 },
  (_, i) => new Date().getFullYear() + 50 - i,
).map((year) => ({ label: year.toString(), value: year }));

const styles = stylex.create({
  timeRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'flex-start',
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  timeInputWrapper: {
    flexGrow: '1',
  },
  timeInputContainer: {
    alignItems: 'center',
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: borderColor['--t-border-color-medium'], ':hover': borderColor['--t-border-color-strong'] },
    borderTopLeftRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderTopRightRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderBottomRightRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    borderBottomLeftRadius: `calc(
    ${borderRadius['--t-border-radius-md']} - ${spacing['--t-spacing-1']}
  )`,
    boxSizing: 'border-box',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-8'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    transition: 'border-color 0.15s ease',
  },
  clockIcon: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
  },
  timeInput: {
    background: 'transparent',
    borderStyle: 'none',
    color: { default: fontColor['--t-font-color-primary'], '::placeholder': fontColor['--t-font-color-light'], ':disabled': fontColor['--t-font-color-tertiary'] },
    flex: '1',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: { default: fontWeight['--t-font-weight-regular'], '::placeholder': fontWeight['--t-font-weight-medium'] },
    letterSpacing: '0.05em',
    outline: 'none',
    width: '100%',
  },
  rightControls: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  navigationButtons: {
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  separator: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    height: '1px',
    width: '100%',
  },
  monthYearSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    width: '160px',
  },
});

type DateTimePickerHeaderProps = {
  instanceId: string;
  date: Temporal.ZonedDateTime | null;
  onChange?: (date: Temporal.ZonedDateTime | null) => void;
  onAddMonth: () => void;
  onSubtractMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
  hideInput?: boolean;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
};

export const DateTimePickerHeader = ({
  instanceId,
  date,
  onChange,
  onAddMonth,
  onSubtractMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  hideInput = false,
  onChangeMonth,
  onChangeYear,
}: DateTimePickerHeaderProps) => {
  const { timeFormat } = useDateTimeFormat();
  const { formatTime, parseTime, isHour12 } = useTimeInput(timeFormat);

  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const userLocale = currentWorkspaceMember?.locale ?? SOURCE_LOCALE;

  const {
    monthSelectDropdownId,
    yearSelectDropdownId,
    monthYearPanelDropdownId,
  } = getDatePickerDropdownIds(instanceId);

  const { ref: iMaskRef, setValue } = useIMask(
    {
      mask: getTimeMask(timeFormat),
      blocks: getTimeBlocks(timeFormat),
      lazy: false,
      autofix: true,
    },
    {
      defaultValue: isDefined(date)
        ? formatTime(date.hour, date.minute)
        : undefined,
      onComplete: (value) => {
        if (!date) return;

        const parsedTime = parseTime(value);
        if (!parsedTime) {
          return;
        }

        onChange?.(
          date.with({ hour: parsedTime.hour, minute: parsedTime.minute }),
        );
      },
    },
  );

  useEffect(() => {
    if (isDefined(date)) {
      setValue(formatTime(date.hour, date.minute));
    }
  }, [date, formatTime, setValue]);

  const timeInputRef = iMaskRef as React.Ref<HTMLInputElement>;

  return (
    <>
      {!hideInput && (
        <>
          <DateTimePickerInput date={date} onChange={onChange} />
          <div {...stylex.props(styles.separator)} />
        </>
      )}
      <div {...stylex.props(styles.timeRow)}>
        <div {...stylex.props(styles.timeInputWrapper)}>
          <div {...stylex.props(styles.timeInputContainer)}>
            <div {...stylex.props(styles.clockIcon)}>
              <IconClock size={16} />
            </div>
            <input
              type="text"
              ref={timeInputRef}
              placeholder={isHour12 ? 'HH:mm AA' : 'HH:mm'} {...stylex.props(styles.timeInput)}
            />
          </div>
        </div>
        <div {...stylex.props(styles.rightControls)}>
          <DropdownRoot dropdownId={monthYearPanelDropdownId} type="panel">
            <Dropdown.Trigger
              render={
                <LightIconButton
                  size="md"
                  aria-label={t`Select month and year`}
                >
                  <IconCalendar />
                </LightIconButton>
              }
            />
            <DropdownContent
              align="start"
              sideOffset={8}
              width={170}
              initialFocus={false}
            >
              <div {...stylex.props(styles.monthYearSelector)}>
                <Select
                  dropdownId={monthSelectDropdownId}
                  options={getMonthSelectOptions(userLocale)}
                  onChange={onChangeMonth}
                  value={date?.month}
                  fullWidth={false}
                  dropdownWidth={160}
                />
                <Select
                  dropdownId={yearSelectDropdownId}
                  onChange={onChangeYear}
                  value={date?.year}
                  options={YEARS_SELECT_OPTIONS}
                  fullWidth={false}
                  dropdownWidth={160}
                />
              </div>
            </DropdownContent>
          </DropdownRoot>
          <div {...stylex.props(styles.navigationButtons)}>
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
        </div>
      </div>
    </>
  );
};
