import { type OnboardingAction } from '@/onboarding/types/OnboardingAction';
import { type Ref } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { MainButton } from 'twenty-ui/components/input';
import { Loader } from 'twenty-ui/primitives/feedback';
import { useTheme } from 'twenty-ui/theme';

type OnboardingMainButtonProps = OnboardingAction & {
  disabled?: boolean;
  isLoading?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export const OnboardingMainButton = ({
  label,
  Icon,
  disabled = false,
  isLoading = false,
  onClick,
  ref,
}: OnboardingMainButtonProps) => {
  const theme = useTheme();

  const getStartIcon = () => {
    if (isLoading) {
      return <Loader />;
    }

    return isDefined(Icon) ? <Icon size={theme.icon.size.md} /> : undefined;
  };

  return (
    <MainButton
      ref={ref}
      fullWidth
      disabled={disabled || isLoading}
      onClick={onClick}
      startIcon={getStartIcon()}
    >
      {label}
    </MainButton>
  );
};
