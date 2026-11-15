import { type StyleXStyles } from '@stylexjs/stylex';

import { type IconComponent } from '@ui/icon';

export type MenuPickerProps = {
  id: string;
  className?: string;
  xstyle?: StyleXStyles;
  disabled?: boolean;
  icon: IconComponent;
  label?: string;
  onClick?: () => void;
  selected?: boolean;
  showLabel?: boolean;
  testId?: string;
  tooltipContent?: string;
  tooltipDelay?: number;
  tooltipOffset?: number;
};
