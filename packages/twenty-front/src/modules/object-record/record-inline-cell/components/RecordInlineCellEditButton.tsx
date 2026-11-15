import { AnimatedContainer } from '@/ui/layout/animation/components/internal/AnimatedContainer/AnimatedContainer';
import { t } from '@lingui/core/macro';
import { IconButton } from 'twenty-ui/components/input';
import { type IconComponent } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  inlineCellButtonContainer: {
    alignItems: 'center',
    display: 'flex',
  },
});

export const RecordInlineCellButton = ({
  Icon,
  onClick,
  ariaLabel,
}: {
  Icon: IconComponent;
  onClick?: () => void;
  ariaLabel?: string;
}) => {
  return (
    <AnimatedContainer>
      <div {...stylex.props(styles.inlineCellButtonContainer)}>
        <IconButton
          elevated
          size="sm"
          aria-label={ariaLabel ?? t`Edit field`}
          onClick={onClick}
          data-testid="inline-cell-edit-mode-container"
        >
          <Icon />
        </IconButton>
      </div>
    </AnimatedContainer>
  );
};
