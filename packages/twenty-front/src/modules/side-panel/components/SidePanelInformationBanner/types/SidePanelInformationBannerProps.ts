import type * as stylex from '@stylexjs/stylex';

export type SidePanelInformationBannerProps = {
  message: string;
  xstyle?: stylex.StyleXStyles;
  variant?: 'default' | 'warning';
  tooltipMessage?: string;
};
