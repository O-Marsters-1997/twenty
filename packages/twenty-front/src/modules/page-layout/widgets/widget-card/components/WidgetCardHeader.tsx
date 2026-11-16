import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { widgetCardHoveredComponentFamilyState } from '@/page-layout/widgets/states/widgetCardHoveredComponentFamilyState';
import { widgetHeaderCountComponentFamilyState } from '@/page-layout/widgets/states/widgetHeaderCountComponentFamilyState';
import { WidgetCardHeaderActionsRenderer } from '@/page-layout/widgets/widget-card/components/WidgetCardHeaderActionsRenderer';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { t } from '@lingui/core/macro';
import { type ReactNode } from 'react';
import { IconButton } from 'twenty-ui/components/input';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconTrash } from 'twenty-ui/icon';

import { type WidgetCardVariant } from '@/page-layout/widgets/types/WidgetCardVariant';
import { WidgetGrip } from '@/page-layout/widgets/widget-card/components/WidgetGrip';
import { AnimatePresence, motion } from 'framer-motion';
import { isDefined } from 'twenty-shared/utils';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';
import { mergeClassName } from '@/page-layout/utils/mergeClassName';
export type WidgetCardHeaderProps = {
  variant: WidgetCardVariant;
  widgetId: string;
  isInEditMode: boolean;
  isEmpty?: boolean;
  hasAccess?: boolean;
  title: string;
  onRemove?: (e?: React.MouseEvent) => void;
  forbiddenDisplay?: ReactNode;
  className?: string;
  isResizing?: boolean;
};

const styles = stylex.create({
  header: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
  },
  headerPlain: { height: spacing['--t-spacing-6'], padding: 0 },
  headerInset: {
    height: `calc(${spacing['--t-spacing-6']} + var(--widget-card-title-padding-top))`,
    paddingBlockStart: 'var(--widget-card-title-padding-top)',
    paddingBlockEnd: 0,
    paddingInline: 'var(--widget-card-padding-inline)',
  },
  iconButtonContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flex: '1',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    userSelect: 'none',
  },
  count: {
    color: fontColor['--t-font-color-light'],
    flexShrink: '0',
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  rightContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-0_5'],
  },
});

export const WidgetCardHeader = ({
  variant,
  widgetId,
  isEmpty = false,
  isInEditMode = false,
  hasAccess = true,
  isResizing = false,
  title,
  onRemove,
  forbiddenDisplay,
  className,
}: WidgetCardHeaderProps) => {
  const theme = useTheme();
  const { formatNumber } = useNumberFormat();
  const widgetCardHovered = useAtomComponentFamilyStateValue(
    widgetCardHoveredComponentFamilyState,
    widgetId,
  );

  const widgetHeaderCount = useAtomComponentFamilyStateValue(
    widgetHeaderCountComponentFamilyState,
    widgetId,
  );

  const shouldInset = variant === 'flush';
  return (
    <div
      {...mergeClassName(
        stylex.props(
          styles.header,
          shouldInset ? styles.headerInset : styles.headerPlain,
        ),
        className,
      )}
    >
      <AnimatePresence initial={false}>
        {!isEmpty && isInEditMode && <WidgetGrip className="drag-handle" />}
      </AnimatePresence>
      <div {...stylex.props(styles.titleContainer)}>
        <OverflowingTextWithTooltip text={isEmpty ? t`Add Widget` : title} />
        {isDefined(widgetHeaderCount) && (
          <span {...stylex.props(styles.count)}>
            {formatNumber(widgetHeaderCount)}
          </span>
        )}
      </div>
      <div {...stylex.props(styles.rightContainer)}>
        {hasAccess && <WidgetCardHeaderActionsRenderer />}
        {isDefined(forbiddenDisplay) && forbiddenDisplay}
        <AnimatePresence initial={false}>
          {!isResizing &&
            !isEmpty &&
            isInEditMode &&
            onRemove &&
            widgetCardHovered && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{
                  duration: theme.animation.duration.fast,
                  ease: 'easeInOut',
                }}
                {...stylex.props(styles.iconButtonContainer)}
              >
                <IconButton
                  aria-label={t`Remove widget`}
                  onClick={onRemove}
                  variant="ghost"
                  size="sm"
                >
                  <IconTrash />
                </IconButton>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};
