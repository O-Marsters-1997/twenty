import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { FEEDBACK_STATUS_COLORS } from '@ui/primitives/feedback/internal/constants/FeedbackStatusColors';
import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { bannerColorStyles, bannerStyles } from '../Banner.stylex';
import { type BannerProps } from '../types/BannerProps';

export const BannerComponent = ({
  status = 'info',
  variant = 'solid',
  color = FEEDBACK_STATUS_COLORS[status],
  icon,
  action,
  className,
  children,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<BannerProps>) => {
  return useRender({
    render,
    ref,
    state: { status, variant, color },
    props: {
      ...props,
      ...mergeStylexProps(
        stylex.props(
          bannerStyles.root,
          bannerColorStyles[color],
          variant === 'solid'
            ? bannerStyles.variantSolid
            : bannerStyles.variantSoft,
          xstyle,
        ),
        className,
      ),
      children: (
        <>
          {isRenderableSlot(icon) && (
            <span {...stylex.props(bannerStyles.slot)}>{icon}</span>
          )}
          {children}
          {isRenderableSlot(action) && (
            <div {...stylex.props(bannerStyles.slot)}>{action}</div>
          )}
        </>
      ),
    },
  });
};
