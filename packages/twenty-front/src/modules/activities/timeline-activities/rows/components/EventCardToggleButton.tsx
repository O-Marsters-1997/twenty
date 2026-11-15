import * as stylex from '@stylexjs/stylex';
import { borderRadius } from 'twenty-ui/theme/tokens.stylex';
import { timelineIconSlot } from '../../constants/TimelineIconSlotSize.stylex';
import { useLingui } from '@lingui/react/macro';
import { IconButton } from 'twenty-ui/components/input';
import { IconChevronDown, IconChevronUp } from 'twenty-ui/icon';

type EventCardToggleButtonProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

const styles = stylex.create({
  buttonContainer: {
    alignItems: 'center',
    borderRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    flexShrink: 0,
    height: timelineIconSlot.size,
  },
});

export const EventCardToggleButton = ({
  isOpen,
  setIsOpen,
}: EventCardToggleButtonProps) => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.buttonContainer)}>
      <IconButton
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? t`Collapse details` : t`Expand details`}
        size="sm"
        variant="outline"
      >
        {isOpen ? <IconChevronUp /> : <IconChevronDown />}
      </IconButton>
    </div>
  );
};
