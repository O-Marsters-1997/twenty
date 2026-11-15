import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { useId, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import {
  autoUpdate,
  FloatingPortal,
  offset,
  flip,
  useFloating,
} from '@floating-ui/react';

import { DateTimePicker } from '@/ui/input/components/internal/date/components/DateTimePicker';
import { useIsDatePickerDropdownOpen } from '@/ui/input/components/internal/date/hooks/useIsDatePickerDropdownOpen';
import { useUserTimezone } from '@/ui/input/components/internal/date/hooks/useUserTimezone';
import { OverlayContainer } from '@/ui/layout/overlay/components/OverlayContainer';
import { ParentClickOutsideIdContext } from '@/ui/utilities/pointer-event/contexts/ParentClickOutsideIdContext';
import { useListenClickOutside } from '@/ui/utilities/pointer-event/hooks/useListenClickOutside';
import { isDefined } from 'twenty-shared/utils';
import { IconCalendar } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { font, spacing } from 'twenty-ui/theme/tokens.stylex';

const SETTINGS_DATE_PICKER_CLICK_OUTSIDE_ID = 'settings-date-picker-floating';

const styles = stylex.create({
  inputContainer: {
    position: 'relative',
  },
  label: {
    color: font['--t-font-color-light'],
    fontSize: font['--t-font-size-xs'],
    fontWeight: font['--t-font-weight-medium'],
    marginBottom: spacing['--t-spacing-1'],
  },
  iconContainer: {
    color: font['--t-font-color-tertiary'],
    display: 'flex',
  },
});

const StyledInput = styled.div<{ hasValue: boolean }>`
  align-items: center;
  background-color: ${themeCssVariables.background.transparent.lighter};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  box-sizing: border-box;
  color: ${({ hasValue }) =>
    hasValue
      ? themeCssVariables.font.color.primary
      : themeCssVariables.font.color.light};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  height: 32px;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: 100%;

  &:hover {
    border-color: ${themeCssVariables.border.color.strong};
  }
`;

type SettingsDatePickerInputProps = {
  label?: string;
  instanceId?: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
};

export const SettingsDatePickerInput = ({
  label,
  instanceId,
  value,
  onChange,
  placeholder,
}: SettingsDatePickerInputProps) => {
  const { t } = useLingui();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { userTimezone } = useUserTimezone();
  const generatedId = useId();

  const pickerInstanceId = instanceId ?? label ?? generatedId;
  const dateTimePickerInstanceId = `settings-date-picker-${pickerInstanceId}`;

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'bottom-start',
    middleware: [offset(4), flip()],
    whileElementsMounted: autoUpdate,
  });

  const handleClose = () => {
    setIsOpen(false);
  };

  const { isDatePickerDropdownOpen } = useIsDatePickerDropdownOpen();

  useListenClickOutside({
    refs: [containerRef],
    listenerId: dateTimePickerInstanceId,
    callback: () => {
      if (isDatePickerDropdownOpen(dateTimePickerInstanceId)) {
        return;
      }

      handleClose();
    },
    enabled: isOpen,
    excludedClickOutsideIds: [SETTINGS_DATE_PICKER_CLICK_OUTSIDE_ID],
  });

  const handleDateTimeChange = (newDateTime: Temporal.ZonedDateTime | null) => {
    if (isDefined(newDateTime)) {
      onChange(new Date(newDateTime.epochMilliseconds));
    }
  };

  const handleDateTimeClose = (_newDateTime: Temporal.ZonedDateTime | null) => {
    handleClose();
  };

  const handleClear = () => {
    onChange(undefined);
    handleClose();
  };

  const formatDisplayValue = (date: Date | undefined): string => {
    if (!isDefined(date)) {
      return placeholder ?? t`Select date & time`;
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: userTimezone,
    });
  };

  const zonedDateTime = isDefined(value)
    ? Temporal.Instant.fromEpochMilliseconds(
        value.getTime(),
      ).toZonedDateTimeISO(userTimezone)
    : null;

  return (
    <div ref={containerRef} {...stylex.props(styles.inputContainer)}>
      {label && <div {...stylex.props(styles.label)}>{label}</div>}
      <StyledInput
        ref={refs.setReference}
        hasValue={isDefined(value)}
        onClick={() => setIsOpen(true)}
      >
        <div {...stylex.props(styles.iconContainer)}>
          <IconCalendar size={16} />
        </div>
        {formatDisplayValue(value)}
      </StyledInput>
      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            data-click-outside-id={SETTINGS_DATE_PICKER_CLICK_OUTSIDE_ID}
          >
            <OverlayContainer>
              <ParentClickOutsideIdContext.Provider
                value={SETTINGS_DATE_PICKER_CLICK_OUTSIDE_ID}
              >
                <DateTimePicker
                  instanceId={dateTimePickerInstanceId}
                  date={zonedDateTime}
                  onChange={handleDateTimeChange}
                  onClose={handleDateTimeClose}
                  onClear={handleClear}
                  clearable
                />
              </ParentClickOutsideIdContext.Provider>
            </OverlayContainer>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
};
