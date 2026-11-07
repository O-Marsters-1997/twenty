import { type IconComponent } from 'twenty-ui/icon';

export type OnboardingAction = {
  label: string;
  Icon?: IconComponent;
  onClick: () => void;
};
