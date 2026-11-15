import { GRAPH_TOOLTIP_MAX_WIDTH_PX } from '@/page-layout/widgets/graph/components/constants/GraphTooltipMaxWidthPx';
import { GRAPH_TOOLTIP_MIN_WIDTH_PX } from '@/page-layout/widgets/graph/components/constants/GraphTooltipMinWidthPx';
import { GRAPH_TOOLTIP_SCROLL_MAX_HEIGHT_PX } from '@/page-layout/widgets/graph/components/constants/GraphTooltipScrollMaxHeightPx';
import { GraphWidgetLegendDot } from '@/page-layout/widgets/graph/components/GraphWidgetLegendDot';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { IconArrowUpRight } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderColor, fontColor, fontSize, fontWeight, spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledTooltip = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-width: min(
    ${GRAPH_TOOLTIP_MAX_WIDTH_PX}px,
    calc(100vw / var(--t-zoom, 1) - 40px)
  );
  min-width: ${GRAPH_TOOLTIP_MIN_WIDTH_PX}px;
  pointer-events: auto;
`;

const styles = stylex.create({
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

const StyledTooltipRowContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  max-height: ${GRAPH_TOOLTIP_SCROLL_MAX_HEIGHT_PX}px;
  overflow-y: auto;
`;

const StyledTooltipLabel = styled.span<{ isHighlighted?: boolean }>`
  color: ${({ isHighlighted }) =>
    isHighlighted
      ? themeCssVariables.font.color.secondary
      : themeCssVariables.font.color.tertiary};
  flex: 1;
  font-weight: ${({ isHighlighted }) =>
    isHighlighted
      ? themeCssVariables.font.weight.medium
      : themeCssVariables.font.weight.regular};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledTooltipValue = styled.span<{ isHighlighted?: boolean }>`
  color: ${({ isHighlighted }) =>
    isHighlighted
      ? themeCssVariables.font.color.tertiary
      : themeCssVariables.font.color.extraLight};
  flex-shrink: 0;
  font-weight: ${({ isHighlighted }) =>
    isHighlighted
      ? themeCssVariables.font.weight.semiBold
      : themeCssVariables.font.weight.medium};
  white-space: nowrap;
`;

const StyledHorizontalSectionPadding = styled.div<{
  addTop?: boolean;
  addBottom?: boolean;
}>`
  margin-bottom: ${({ addBottom }) =>
    addBottom ? themeCssVariables.spacing[1] : 0};
  margin-top: ${({ addTop }) => (addTop ? themeCssVariables.spacing[1] : 0)};
  padding-inline: ${themeCssVariables.spacing[1]};
`;

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
    <StyledTooltip>
      <StyledHorizontalSectionPadding addTop addBottom={!shouldShowClickFooter}>
        <div {...stylex.props(styles.tooltipContent)}>
          {indexLabel && (
            <div {...stylex.props(styles.tooltipHeader)}>{indexLabel}</div>
          )}
          <StyledTooltipRowContainer>
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
                      <StyledTooltipLabel isHighlighted={isHighlighted}>
                        {item.label}
                      </StyledTooltipLabel>
                      <StyledTooltipValue isHighlighted={isHighlighted}>
                        {item.formattedValue}
                      </StyledTooltipValue>
                    </div>
                  </div>
                );
              })
            )}
          </StyledTooltipRowContainer>
        </div>
      </StyledHorizontalSectionPadding>
      {shouldShowClickFooter && (
        <>
          <div {...stylex.props(styles.tooltipSeparator)} />
          <StyledHorizontalSectionPadding addBottom>
            <div onClick={onGraphWidgetTooltipClick} {...stylex.props(styles.tooltipLink)}>
              <span>{t`Click to see data`}</span>
              <IconArrowUpRight size={theme.icon.size.sm} />
            </div>
          </StyledHorizontalSectionPadding>
        </>
      )}
    </StyledTooltip>
  );
};
