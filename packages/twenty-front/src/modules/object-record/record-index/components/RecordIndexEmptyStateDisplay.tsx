import { AnimatedPlaceholder } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/AnimatedPlaceholder';
import { EmptyState } from '@/ui/feedback/empty-state/components/EmptyState';
import { isDefined } from 'twenty-shared/utils';

import { type AnimatedPlaceholderType } from '@/ui/feedback/empty-state/components/AnimatedPlaceholder/types/AnimatedPlaceholderType';
import { type IconComponent } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  emptyStateContainer: {
    height: '100%',
    width: '100%',
  },
});

type RecordIndexEmptyStateDisplayProps = {
  animatedPlaceholderType: AnimatedPlaceholderType;
  title: string;
  subTitle: string;
  ButtonIcon?: IconComponent;
  buttonTitle?: string;
  onButtonClick?: () => void;
  width?: number;
};

export const RecordIndexEmptyStateDisplay = ({
  animatedPlaceholderType,
  title,
  subTitle,
  ButtonIcon,
  buttonTitle,
  onButtonClick,
  width,
}: RecordIndexEmptyStateDisplayProps) => (
  <div {...stylex.props(styles.emptyStateContainer)}>
    <EmptyState.Root width={width}>
      <AnimatedPlaceholder type={animatedPlaceholderType} />
      <EmptyState.Content>
        <EmptyState.Title>{title}</EmptyState.Title>
        <EmptyState.Description>{subTitle}</EmptyState.Description>
      </EmptyState.Content>
      {isDefined(onButtonClick) && (
        <Button
          startIcon={isDefined(ButtonIcon) ? <ButtonIcon /> : undefined}
          onClick={onButtonClick}
          variant="outline"
        >
          {buttonTitle}
        </Button>
      )}
    </EmptyState.Root>
  </div>
);
