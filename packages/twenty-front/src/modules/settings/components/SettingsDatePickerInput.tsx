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
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const SETTINGS_DATE_PICKER_CLICK_OUTSIDE_ID = 'settings-date-picker-floating';

const styles = stylex.create({
  inputContainer: {
    position: 'relative',
  },
  label: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginBottom: spacing['--t-spacing-1'],
  },
  iconContainer: {
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
  },
  input: {
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':hover': borderColor['--t-border-color-strong'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-2'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    height: '32px',
    width: '100%',
  },
  inputWithValue: {
    color: fontColor['--t-font-color-primary'],
  },
  inputWithoutValue: {
    color: fontColor['--t-font-color-light'],
  },
});

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
      <div
        ref={refs.setReference}
        {...stylex.props(
          styles.input,
          isDefined(value) ? styles.inputWithValue : styles.inputWithoutValue,
        )}
        onClick={() => setIsOpen(true)}
      >
        <div {...stylex.props(styles.iconContainer)}>
          <IconCalendar size={16} />
        </div>
        {formatDisplayValue(value)}
      </div>
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
