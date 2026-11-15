import { useIsPageLayoutInEditMode } from '@/page-layout/hooks/useIsPageLayoutInEditMode';
import { GraphWidgetLegendDot } from '@/page-layout/widgets/graph/components/GraphWidgetLegendDot';
import { LEGEND_HIGHLIGHT_DIMMED_OPACITY } from '@/page-layout/widgets/graph/constants/LegendHighlightDimmedOpacity';
import { LEGEND_ITEM_ESTIMATED_WIDTH } from '@/page-layout/widgets/graph/constants/LegendItemEstimatedWidth';
import { LEGEND_LABEL_MAX_WIDTH } from '@/page-layout/widgets/graph/constants/LegendLabelMaxWidth';
import { LEGEND_PAGINATION_CONTROLS_WIDTH } from '@/page-layout/widgets/graph/constants/LegendPaginationControlsWidth';
import { useLegendItemToggle } from '@/page-layout/widgets/graph/hooks/useLegendItemToggle';
import { graphWidgetHiddenLegendIdsComponentState } from '@/page-layout/widgets/graph/states/graphWidgetHiddenLegendIdsComponentState';
import { graphWidgetHighlightedLegendIdComponentState } from '@/page-layout/widgets/graph/states/graphWidgetHighlightedLegendIdComponentState';
import { NodeDimensionEffect } from '@/ui/utilities/dimensions/components/NodeDimensionEffect';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { t } from '@lingui/core/macro';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconChevronLeft, IconChevronRight } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

export type GraphWidgetLegendItem = {
  id: string;
  label: string;
  color: string;
};

type GraphWidgetLegendProps = {
  items: GraphWidgetLegendItem[];
  show?: boolean;
};

type AnimationDirection = 'forward' | 'backward';

const styles = stylex.create({
  motionWrapper: { width: '100%' },
  itemsWrapper: {
    display: 'flex',
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    flexWrap: 'nowrap',
    gap: spacing['--t-spacing-3'],
    justifyContent: 'flex-start',
    minWidth: 0,
  },
  itemsWrapperCentered: { justifyContent: 'center' },
  legendContainer: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'nowrap',
    gap: spacing['--t-spacing-3'],
    justifyContent: 'flex-start',
    overflow: 'hidden',
    paddingTop: spacing['--t-spacing-3'],
    width: '100%',
  },
  legendContainerCentered: { justifyContent: 'center' },
  legendItem: {
    alignItems: 'center',
    cursor: 'default',
    display: 'flex',
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    gap: spacing['--t-spacing-1'],
    minWidth: 0,
  },
  legendItemShrinks: { flexShrink: 1 },
  legendItemInteractive: { cursor: 'pointer' },
  legendLabel: {
    color: fontColor['--t-font-color-secondary'],
    opacity: { default: 1, ':hover': 1 },
    overflow: 'hidden',
    textDecoration: 'none',
    width: 'auto',
  },
  legendLabelHidden: (dimmedOpacity: number) => ({
    opacity: { default: dimmedOpacity, ':hover': 1 },
    textDecoration: 'line-through',
  }),
  legendLabelFixedWidth: (maxWidth: number) => ({ width: maxWidth }),
  legendDotWrapper: { display: 'flex', opacity: 1 },
  legendDotWrapperHidden: (dimmedOpacity: number) => ({
    opacity: dimmedOpacity,
  }),
  animationClipContainer: {
    flex: '1',
    minWidth: '0',
    overflow: 'hidden',
    position: 'relative',
  },
  paginationContainer: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
    flexShrink: '0',
    gap: spacing['--t-spacing-0_5'],
  },
  paginationIndicator: {
    color: fontColor['--t-font-color-light'],
    fontSize: fontSize['--t-font-size-xs'],
  },
});

const legendEnterExitVariants = {
  hidden: {
    y: 10,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
  },
  exit: {
    y: 10,
    opacity: 0,
  },
};

export const GraphWidgetLegend = ({
  items,
  show = true,
}: GraphWidgetLegendProps) => {
  const theme = useTheme();

  const containerRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(0);

  const [containerWidth, setContainerWidth] = useState(0);

  const [animationDirection, setAnimationDirection] =
    useState<AnimationDirection>('forward');

  const isPageLayoutInEditMode = useIsPageLayoutInEditMode();

  const isInteractive = !isPageLayoutInEditMode;

  const setGraphWidgetHighlightedLegendId = useSetAtomComponentState(
    graphWidgetHighlightedLegendIdComponentState,
  );

  const [graphWidgetHiddenLegendIds, setGraphWidgetHiddenLegendIds] =
    useAtomComponentState(graphWidgetHiddenLegendIdsComponentState);

  const itemIds = items.map((item) => item.id);

  const { toggleLegendItem } = useLegendItemToggle({
    itemIds,
    isInteractive,
  });

  if (isPageLayoutInEditMode && graphWidgetHiddenLegendIds.length > 0) {
    setGraphWidgetHiddenLegendIds([]);
  }

  const handleLegendItemMouseEnter = (itemId: string) => {
    if (!isInteractive) {
      return;
    }
    setGraphWidgetHighlightedLegendId(itemId);
  };

  const handleLegendItemMouseLeave = () => {
    if (!isInteractive) {
      return;
    }
    setGraphWidgetHighlightedLegendId(null);
  };

  const shouldShowLegend = show && items.length > 1;

  const availableWidth = containerWidth - LEGEND_PAGINATION_CONTROLS_WIDTH;

  const itemsPerPage = Math.max(
    1,
    Math.floor(availableWidth / LEGEND_ITEM_ESTIMATED_WIDTH),
  );

  const needsPagination = items.length > itemsPerPage;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, Math.max(0, totalPages - 1));

  const startIndex = safeCurrentPage * itemsPerPage;
  const visibleItems = needsPagination
    ? items.slice(startIndex, startIndex + itemsPerPage)
    : items;

  const handlePreviousPage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setAnimationDirection('backward');
    setCurrentPage((prevPage) => Math.max(0, prevPage - 1));
  };

  const handleNextPage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setAnimationDirection('forward');
    setCurrentPage((prevPage) => Math.min(totalPages - 1, prevPage + 1));
  };

  const slideOffset = availableWidth;

  const variants = {
    enter: (direction: AnimationDirection) => ({
      x: direction === 'forward' ? slideOffset : -slideOffset,
    }),
    center: {
      x: 0,
    },
    exit: (direction: AnimationDirection) => ({
      x: direction === 'forward' ? -slideOffset : slideOffset,
    }),
  };

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {shouldShowLegend && (
        <motion.div
          variants={legendEnterExitVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{
            duration: theme.animation.duration.normal,
            ease: 'easeInOut',
          }}
          {...stylex.props(styles.motionWrapper)}
        >
          <div
            ref={containerRef}
            {...stylex.props(
              styles.legendContainer,
              !needsPagination && styles.legendContainerCentered,
            )}
          >
            <NodeDimensionEffect
              elementRef={containerRef}
              onDimensionChange={({ width }) => {
                const newItemsPerPage = Math.max(
                  1,
                  Math.floor(
                    (width - LEGEND_PAGINATION_CONTROLS_WIDTH) /
                      LEGEND_ITEM_ESTIMATED_WIDTH,
                  ),
                );

                if (newItemsPerPage !== itemsPerPage) {
                  setCurrentPage(0);
                }

                setContainerWidth(width);
              }}
            />
            {needsPagination && (
              <div {...stylex.props(styles.paginationContainer)}>
                <LightIconButton
                  onClick={handlePreviousPage}
                  disabled={safeCurrentPage === 0}
                  emphasis="subtle"
                  aria-label={t`Previous`}
                >
                  <IconChevronLeft />
                </LightIconButton>
                <span {...stylex.props(styles.paginationIndicator)}>
                  {safeCurrentPage + 1}/{totalPages}
                </span>
                <LightIconButton
                  onClick={handleNextPage}
                  disabled={safeCurrentPage === totalPages - 1}
                  aria-label={t`Next`}
                >
                  <IconChevronRight />
                </LightIconButton>
              </div>
            )}
            <div {...stylex.props(styles.animationClipContainer)}>
              <AnimatePresence
                mode="popLayout"
                custom={animationDirection}
                initial={false}
              >
                <motion.div
                  key={safeCurrentPage}
                  custom={animationDirection}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    duration: theme.animation.duration.normal,
                    ease: 'easeInOut',
                  }}
                  {...stylex.props(
                    styles.itemsWrapper,
                    !needsPagination && styles.itemsWrapperCentered,
                  )}
                >
                  {visibleItems.map((item) => {
                    const isHidden = graphWidgetHiddenLegendIds.includes(
                      item.id,
                    );
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleLegendItem(item.id)}
                        onMouseEnter={() => handleLegendItemMouseEnter(item.id)}
                        onMouseLeave={handleLegendItemMouseLeave}
                        {...stylex.props(
                          styles.legendItem,
                          !needsPagination && styles.legendItemShrinks,
                          isInteractive && styles.legendItemInteractive,
                        )}
                      >
                        <div
                          {...stylex.props(
                            styles.legendDotWrapper,
                            isHidden &&
                              styles.legendDotWrapperHidden(
                                LEGEND_HIGHLIGHT_DIMMED_OPACITY,
                              ),
                          )}
                        >
                          <GraphWidgetLegendDot color={item.color} />
                        </div>
                        <div
                          {...stylex.props(
                            styles.legendLabel,
                            isHidden &&
                              styles.legendLabelHidden(
                                LEGEND_HIGHLIGHT_DIMMED_OPACITY,
                              ),
                            needsPagination &&
                              styles.legendLabelFixedWidth(
                                LEGEND_LABEL_MAX_WIDTH,
                              ),
                          )}
                        >
                          <OverflowingTextWithTooltip text={item.label} />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
