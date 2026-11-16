import { isString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';

import { IconInfoCircle } from '@ui/icon/components/TablerIcons';
import { Banner } from '@ui/primitives/feedback/Banner/Banner';
import { OverflowingTextWithTooltip } from '@ui/primitives/typography/OverflowingTextWithTooltip/OverflowingTextWithTooltip';
import { FEEDBACK_STATUS_COLORS } from '@ui/primitives/feedback/internal/constants/FeedbackStatusColors';
import { isRenderableSlot } from '@ui/utilities/internal/isRenderableSlot';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  borderRadius,
  color as themeColor,
  spacing,
} from '../../../../theme/tokens.stylex';
import '../InlineBanner.css';
import { type InlineBannerProps } from '../types/InlineBannerProps';

export const InlineBannerComponent = ({
  children,
  layout = 'standard',
  variant = 'soft',
  embedded = false,
  icon = <IconInfoCircle aria-hidden="true" />,
  status = 'info',
  color = FEEDBACK_STATUS_COLORS[status],
  className,
  xstyle,
  ...props
}: WithXstyle<InlineBannerProps>) => {
  const isCompact = layout === 'compact';
  const shouldTruncateText = !isCompact && isString(children);

  return (
    <Banner
      {...props}
      {...mergeStylexProps(
        stylex.props(
          styles.banner,
          embedded && styles.embedded,
          isCompact && styles.compact,
          isCompact &&
            variant === 'soft' &&
            color === 'blue' &&
            styles.compactSoftBlue,
          isCompact &&
            variant === 'soft' &&
            color === 'red' &&
            styles.compactSoftRed,
          xstyle,
        ),
        className,
      )}
      status={status}
      color={color}
      variant={variant}
      data-layout={layout}
    >
      <div
        {...stylex.props(
          styles.bannerContent,
          isCompact && styles.bannerContentCompact,
        )}
      >
        {isRenderableSlot(icon) && (
          <span data-inline-banner-icon {...stylex.props(styles.icon)}>
            {icon}
          </span>
        )}
        <div {...stylex.props(styles.bannerText)}>
          {shouldTruncateText ? (
            <OverflowingTextWithTooltip
              isFocusable
              text={<>{children}</>}
              tooltipContent={children}
            />
          ) : (
            children
          )}
        </div>
      </div>
    </Banner>
  );
};

const styles = stylex.create({
  banner: {
    borderRadius: borderRadius['--t-border-radius-md'],
    marginBottom: spacing['--t-spacing-4'],
  },
  embedded: {
    marginBottom: 0,
  },
  bannerContent: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    gap: spacing['--t-spacing-2'],
    minWidth: 0,
  },
  bannerContentCompact: {
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 1,
  },
  icon: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
  },
  bannerText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minWidth: 0,
  },
  compact: {
    boxSizing: 'content-box',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    fontStyle: 'inherit',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    lineHeight: 'inherit',
    marginBottom: 0,
    maxWidth: 512,
    minHeight: 'auto',
    width: 'auto',
  },
  compactSoftBlue: {
    backgroundColor: themeColor['--t-color-blue5'],
    color: themeColor['--t-color-blue10'],
  },
  compactSoftRed: {
    backgroundColor: themeColor['--t-color-red3'],
    color: themeColor['--t-color-red'],
  },
});
