import { FloatingPortal } from '@floating-ui/react';
import { useLingui } from '@lingui/react/macro';
import { isAiModelEffort } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';
import {
  IconBrain,
  IconChartBar,
  IconCpu,
  IconCurrencyDollar,
  IconGauge,
  IconInfoCircle,
} from 'twenty-ui/icon';
import { Separator } from 'twenty-ui/primitives/layout';
import { MetricRow } from 'twenty-ui/components/data-display';
import { useTheme, useThemeContainer } from 'twenty-ui/theme';

import { useAiChatHoverCard } from '@/ai/hooks/useAiChatHoverCard';
import { type ResolvedAiModelTier } from '@/ai/types/ResolvedAiModelTier';
import { getAiModelEffortLabel } from '@/ai/utils/getAiModelEffortLabel';
import { getAiModelModeDescription } from '@/ai/utils/getAiModelModeDescription';
import { StyledInformationCard } from '@/ui/layout/information-card/components/StyledInformationCard';
import { formatNumber } from '@/localization/utils/formatNumber';
import * as stylex from '@stylexjs/stylex';
import {
  borderRadius,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  trigger: {
    background: 'transparent',
    borderStyle: 'none',
    outline: {
      default: null,
      ':focus-visible': `2px solid ${color['--t-color-blue']}`,
    },
    alignItems: 'center',
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    height: '20px',
    paddingBottom: '0',
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: '0',
    width: '20px',
  },
  heading: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-2'],
  },
  note: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
});

type AiModelTierInformationButtonProps = {
  resolvedTier: ResolvedAiModelTier;
};

export const AiModelTierInformationButton = ({
  resolvedTier,
}: AiModelTierInformationButtonProps) => {
  const { t } = useLingui();
  const theme = useTheme();

  const themeContainer = useThemeContainer();

  const { isOpen, refs, floatingStyles, getReferenceProps, getFloatingProps } =
    useAiChatHoverCard({ placement: 'top-end', role: 'tooltip' });

  const model = resolvedTier.model;

  const effort = model?.effort;

  const formatComparison = (delta: number | undefined) =>
    isDefined(delta)
      ? `${delta > 0 ? '+' : ''}${formatNumber(delta, { decimals: 1 })}%`
      : t`Not available`;

  const rows = [
    {
      label: t`Model`,
      Icon: IconCpu,
      value: getAiModelModeDescription(resolvedTier, {
        showAutomatic: false,
        showEffort: false,
      }),
    },
    {
      label: t`Effort`,
      Icon: IconBrain,
      value: !isDefined(model)
        ? t`Not available`
        : isDefined(effort) && isAiModelEffort(effort)
          ? getAiModelEffortLabel(effort)
          : t`Default`,
    },
  ];

  const comparisons = [
    {
      label: t`Intelligence`,
      Icon: IconChartBar,
      value: formatComparison(resolvedTier.intelligenceDeltaPercent),
    },
    {
      label: t`Speed`,
      Icon: IconGauge,
      value: formatComparison(resolvedTier.speedDeltaPercent),
    },
    {
      label: t`Cost index`,
      Icon: IconCurrencyDollar,
      value: isDefined(resolvedTier.costDeltaPercent)
        ? `×${formatNumber(1 + resolvedTier.costDeltaPercent / 100, { decimals: 2 })}`
        : t`Not available`,
    },
  ];

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        aria-label={t`Model information`}
        // oxlint-disable-next-line react/jsx-props-no-spreading
        {...getReferenceProps()}
        {...stylex.props(styles.trigger)}
      >
        <IconInfoCircle size={theme.icon.size.sm} />
      </button>
      {isOpen && (
        <FloatingPortal root={themeContainer}>
          <StyledInformationCard
            ref={refs.setFloating}
            style={floatingStyles}
            // oxlint-disable-next-line react/jsx-props-no-spreading
            {...getFloatingProps()}
          >
            {rows.map(({ label, Icon, value }) => (
              <MetricRow
                key={label}
                startIcon={<Icon size={theme.icon.size.sm} />}
                value={value}
              >
                {label}
              </MetricRow>
            ))}
            <Separator />
            <div {...stylex.props(styles.heading)}>{t`Vs Balanced mode`}</div>
            {comparisons.map(({ label, Icon, value }) => (
              <MetricRow
                key={label}
                startIcon={<Icon size={theme.icon.size.sm} />}
                value={value}
              >
                {label}
              </MetricRow>
            ))}
            {model?.isBenchmarkInherited === true && (
              <div
                {...stylex.props(styles.note)}
              >{t`Not measured at this effort yet, so these are the base model's readings.`}</div>
            )}
          </StyledInformationCard>
        </FloatingPortal>
      )}
    </>
  );
};
