import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { t } from '@lingui/core/macro';
import { SOURCE_LOCALE } from 'twenty-shared/translations';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  monthYearLabel: {
    color: fontColor['--t-font-color-primary'],
    flex: '1',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    textAlign: 'center',
  },
});

type RelativeDatePickerCalendarNavigationProps = {
  monthLabelDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  prevMonthButtonDisabled: boolean;
  nextMonthButtonDisabled: boolean;
};

export const RelativeDatePickerCalendarNavigation = ({
  monthLabelDate,
  onPreviousMonth,
  onNextMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
}: RelativeDatePickerCalendarNavigationProps) => {
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const userLocale = currentWorkspaceMember?.locale ?? SOURCE_LOCALE;

  const monthYearLabel = new Intl.DateTimeFormat(userLocale, {
    month: 'long',
    year: 'numeric',
  }).format(monthLabelDate);

  return (
    <div {...stylex.props(styles.container)}>
      <LightIconButton
        onClick={onPreviousMonth}
        size="md"
        disabled={prevMonthButtonDisabled}
        aria-label={t`Previous`}
      >
        <IconChevronLeft />
      </LightIconButton>
      <span {...stylex.props(styles.monthYearLabel)}>{monthYearLabel}</span>
      <LightIconButton
        onClick={onNextMonth}
        size="md"
        disabled={nextMonthButtonDisabled}
        aria-label={t`Next`}
      >
        <IconChevronRight />
      </LightIconButton>
    </div>
  );
};
