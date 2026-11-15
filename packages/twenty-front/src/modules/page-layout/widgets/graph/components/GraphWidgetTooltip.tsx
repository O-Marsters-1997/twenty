import { GRAPH_TOOLTIP_MAX_WIDTH_PX } from '@/page-layout/widgets/graph/components/constants/GraphTooltipMaxWidthPx';
import { GRAPH_TOOLTIP_MIN_WIDTH_PX } from '@/page-layout/widgets/graph/components/constants/GraphTooltipMinWidthPx';
import { GRAPH_TOOLTIP_SCROLL_MAX_HEIGHT_PX } from '@/page-layout/widgets/graph/components/constants/GraphTooltipScrollMaxHeightPx';
import { GraphWidgetLegendDot } from '@/page-layout/widgets/graph/components/GraphWidgetLegendDot';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { IconArrowUpRight } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  background,
  borderColor,
  borderRadius,
  boxShadow,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tooltip: {
    backgroundColor: background['--t-background-primary'],
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: boxShadow['--t-box-shadow-strong'],
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    pointerEvents: 'auto',
  },
  tooltipSize: (maxWidth: number, minWidth: number) => ({
    maxWidth: `min(${maxWidth}px, calc(100vw / var(--t-zoom, 1) - 40px))`,
    minWidth,
  }),
  rowContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    overflowY: 'auto',
  },
  rowContainerMaxHeight: (maxHeight: number) => ({ maxHeight }),
  label: {
    color: fontColor['--t-font-color-tertiary'],
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    fontWeight: fontWeight['--t-font-weight-regular'],
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  labelHighlighted: {
    color: fontColor['--t-font-color-secondary'],
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  value: {
    color: fontColor['--t-font-color-extra-light'],
    flexShrink: 0,
    fontWeight: fontWeight['--t-font-weight-medium'],
    whiteSpace: 'nowrap',
  },
  valueHighlighted: {
    color: fontColor['--t-font-color-tertiary'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  sectionPadding: {
    marginBottom: 0,
    marginTop: 0,
    paddingInline: spacing['--t-spacing-1'],
  },
  sectionPaddingTop: { marginTop: spacing['--t-spacing-1'] },
  sectionPaddingBottom: { marginBottom: spacing['--t-spacing-1'] },
  tooltipContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  tooltipRow: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  tooltipLink: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    cursor: 'pointer',
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-regular'],
    height: spacing['--t-spacing-6'],
    justifyContent: 'space-between',
    lineHeight: '140%',
    paddingInline: spacing['--t-spacing-2'],
  },
  tooltipSeparator: {
    backgroundColor: borderColor['--t-border-color-light'],
    minHeight: '1px',
    width: '100%',
  },
  tooltipHeader: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    lineHeight: '140%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tooltipRowRightContent: {
    alignItems: 'center',
    color: fontColor['--t-font-color-extra-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-regular'],
    gap: spacing['--t-spacing-2'],
    justifyContent: 'space-between',
    minWidth: '0',
    width: '100%',
  },
  noDataMessage: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-xs'],
  },
});

export type GraphWidgetTooltipItem = {
  key: string;
  label: string;
  formattedValue: string;
  value: number;
  dotColor: string;
};

type GraphWidgetTooltipProps = {
  items: GraphWidgetTooltipItem[];
  indexLabel?: string;
  highlightedKey?: string;
  onGraphWidgetTooltipClick?: () => void;
};

export const GraphWidgetTooltip = ({
  items,
  indexLabel,
  highlightedKey,
  onGraphWidgetTooltipClick,
}: GraphWidgetTooltipProps) => {
  const theme = useTheme();

  const filteredItems = items.filter(
    (item) => item.value !== 0 && isNonEmptyString(item.formattedValue),
  );

  const hasData = filteredItems.length > 0;
  const shouldHighlight = filteredItems.length > 1;
  const shouldShowClickFooter = hasData && isDefined(onGraphWidgetTooltipClick);

  return (
    <div
      {...stylex.props(
        styles.tooltip,
        styles.tooltipSize(
          GRAPH_TOOLTIP_MAX_WIDTH_PX,
          GRAPH_TOOLTIP_MIN_WIDTH_PX,
        ),
      )}
    >
      <div
        {...stylex.props(
          styles.sectionPadding,
          styles.sectionPaddingTop,
          !shouldShowClickFooter && styles.sectionPaddingBottom,
        )}
      >
        <div {...stylex.props(styles.tooltipContent)}>
          {indexLabel && (
            <div {...stylex.props(styles.tooltipHeader)}>{indexLabel}</div>
          )}
          <div
            {...stylex.props(
              styles.rowContainer,
              styles.rowContainerMaxHeight(GRAPH_TOOLTIP_SCROLL_MAX_HEIGHT_PX),
            )}
          >
            {filteredItems.length === 0 ? (
              <span {...stylex.props(styles.noDataMessage)}>{t`No data`}</span>
            ) : (
              filteredItems.map((item) => {
                const isHighlighted =
                  shouldHighlight && highlightedKey === item.key;
                return (
                  <div key={item.key} {...stylex.props(styles.tooltipRow)}>
                    <GraphWidgetLegendDot color={item.dotColor} />
                    <div {...stylex.props(styles.tooltipRowRightContent)}>
                      <span
                        {...stylex.props(
                          styles.label,
                          isHighlighted && styles.labelHighlighted,
                        )}
                      >
                        {item.label}
                      </span>
                      <span
                        {...stylex.props(
                          styles.value,
                          isHighlighted && styles.valueHighlighted,
                        )}
                      >
                        {item.formattedValue}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {shouldShowClickFooter && (
        <>
          <div {...stylex.props(styles.tooltipSeparator)} />
          <div
            {...stylex.props(
              styles.sectionPadding,
              styles.sectionPaddingBottom,
            )}
          >
            <div
              onClick={onGraphWidgetTooltipClick}
              {...stylex.props(styles.tooltipLink)}
            >
              <span>{t`Click to see data`}</span>
              <IconArrowUpRight size={theme.icon.size.sm} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
