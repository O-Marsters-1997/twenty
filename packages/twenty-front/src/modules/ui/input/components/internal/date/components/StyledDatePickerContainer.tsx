import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

export const DATE_PICKER_CONTAINER_WIDTH = 280;

const styles = stylex.create({
  root: {
    width: `${DATE_PICKER_CONTAINER_WIDTH}px`,
  },
});

type StyledDatePickerContainerProps = {
  calendarDisabled?: boolean;
  hideCalendar?: boolean;
  children: ReactNode;
};

export const StyledDatePickerContainer = ({
  calendarDisabled,
  hideCalendar,
  children,
}: StyledDatePickerContainerProps) => (
  <div
    data-date-picker-container=""
    data-calendar-disabled={calendarDisabled === true}
    data-hide-calendar={hideCalendar === true}
    {...stylex.props(styles.root)}
  >
    {children}
  </div>
);
