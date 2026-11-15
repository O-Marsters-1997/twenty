import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { widgetCardHoveredComponentFamilyState } from '@/page-layout/widgets/states/widgetCardHoveredComponentFamilyState';
import { widgetHeaderCountComponentFamilyState } from '@/page-layout/widgets/states/widgetHeaderCountComponentFamilyState';
import { WidgetCardHeaderActionsRenderer } from '@/page-layout/widgets/widget-card/components/WidgetCardHeaderActionsRenderer';
import { useAtomComponentFamilyStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentFamilyStateValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { type ReactNode } from 'react';
import { IconButton } from 'twenty-ui/components/input';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconTrash } from 'twenty-ui/icon';

import { type WidgetCardVariant } from '@/page-layout/widgets/types/WidgetCardVariant';
import { WidgetGrip } from '@/page-layout/widgets/widget-card/components/WidgetGrip';
import { AnimatePresence, motion } from 'framer-motion';
import { isDefined } from 'twenty-shared/utils';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { font, spacing } from 'twenty-ui/theme/tokens.stylex';
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

const StyledWidgetCardHeader = styled.div<{ shouldInset: boolean }>`
  align-items: center;
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  height: ${({ shouldInset }) =>
    shouldInset
      ? `calc(${themeCssVariables.spacing[6]} + var(--widget-card-title-padding-top))`
      : themeCssVariables.spacing[6]};
  padding: ${({ shouldInset }) =>
    shouldInset
      ? `var(--widget-card-title-padding-top) var(--widget-card-padding-inline) 0`
      : '0'};
`;

const styles = stylex.create({
  titleContainer: {
    alignItems: 'center',
    color: font['--t-font-color-primary'],
    display: 'flex',
    flex: '1',
    fontSize: font['--t-font-size-md'],
    fontWeight: font['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    userSelect: 'none',
  },
  count: {
    color: font['--t-font-color-light'],
    flexShrink: '0',
    fontWeight: font['--t-font-weight-regular'],
  },
  rightContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-0_5'],
  },
});

const StyledIconButtonContainerBase = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
`;
const StyledIconButtonContainer = motion.create(StyledIconButtonContainerBase);

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
    <StyledWidgetCardHeader className={className} shouldInset={shouldInset}>
      <AnimatePresence initial={false}>
        {!isEmpty && isInEditMode && <WidgetGrip className="drag-handle" />}
      </AnimatePresence>
      <div {...stylex.props(styles.titleContainer)}>
        <OverflowingTextWithTooltip text={isEmpty ? t`Add Widget` : title} />
        {isDefined(widgetHeaderCount) && (
          <span {...stylex.props(styles.count)}>{formatNumber(widgetHeaderCount)}</span>
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
              <StyledIconButtonContainer
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{
                  duration: theme.animation.duration.fast,
                  ease: 'easeInOut',
                }}
              >
                <IconButton
                  aria-label={t`Remove widget`}
                  onClick={onRemove}
                  variant="ghost"
                  size="sm"
                >
                  <IconTrash />
                </IconButton>
              </StyledIconButtonContainer>
            )}
        </AnimatePresence>
      </div>
    </StyledWidgetCardHeader>
  );
};
