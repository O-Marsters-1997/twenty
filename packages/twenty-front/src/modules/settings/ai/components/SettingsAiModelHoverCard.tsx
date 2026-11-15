import { getChipLabel } from '@/ui/field/display/utils/getChipLabel';
import { t } from '@lingui/core/macro';
import { Chip } from 'twenty-ui/primitives/data-display';
import {
  IconBolt,
  IconBuildingSkyscraper,
  IconFlag,
  IconTag,
  IconWindow,
  type IconComponent,
} from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';

import { type AiModelSummary } from '@/settings/ai/types/AiModelSummary';
import { getDataResidencyDisplay } from '@/ai/utils/getDataResidencyDisplay';
import { getModelIcon } from '@/ai/utils/getModelIcon';
import { SettingsTableCard } from '@/settings/components/SettingsTableCard';
import { isDefined } from 'twenty-shared/utils';
import { formatNumber } from '@/localization/utils/formatNumber';
import * as stylex from '@stylexjs/stylex';
import { border, boxShadow } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  hoverCardWrapper: {
    borderTopLeftRadius: border['--t-border-radius-md'],
    borderTopRightRadius: border['--t-border-radius-md'],
    borderBottomRightRadius: border['--t-border-radius-md'],
    borderBottomLeftRadius: border['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    overflow: 'hidden',
    width: '320px',
  },
  chipContainer: {
    maxWidth: '100%',
    overflow: 'hidden',
  },
  valueText: {
    display: 'inline-block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type SettingsAiModelHoverCardProps = {
  model: AiModelSummary;
};

type HoverCardItem = {
  Icon: IconComponent;
  label: string;
  value: React.ReactNode;
};

export const SettingsAiModelHoverCard = ({
  model,
}: SettingsAiModelHoverCardProps) => {
  const theme = useTheme();

  const ModelIcon = getModelIcon(model.modelFamily, model.providerName);
  const providerLabel = model.providerLabel ?? model.providerName ?? '—';

  const items: HoverCardItem[] = [
    {
      Icon: IconTag,
      label: t`Name`,
      value: (
        <div {...stylex.props(styles.chipContainer)}>
          <Chip
            size="sm"
            color="primary"
            variant="soft"
            startElement={
              <ModelIcon
                size={theme.icon.size.sm}
                stroke={theme.icon.stroke.sm}
              />
            }
            endElement={null}
          >
            {getChipLabel(model.label).content}
          </Chip>
        </div>
      ),
    },
    {
      Icon: IconBuildingSkyscraper,
      label: t`Provider`,
      value: <span {...stylex.props(styles.valueText)}>{providerLabel}</span>,
    },
    ...(isDefined(model.contextWindowTokens)
      ? [
          {
            Icon: IconWindow,
            label: t`Context`,
            value: (
              <span {...stylex.props(styles.valueText)}>
                {`${formatNumber(model.contextWindowTokens, {
                  abbreviate: true,
                  decimals: 1,
                })} tokens`}
              </span>
            ),
          },
        ]
      : []),
    ...(isDefined(model.maxOutputTokens)
      ? [
          {
            Icon: IconBolt,
            label: t`Max output`,
            value: (
              <span {...stylex.props(styles.valueText)}>
                {`${formatNumber(model.maxOutputTokens, {
                  abbreviate: true,
                  decimals: 1,
                })} tokens`}
              </span>
            ),
          },
        ]
      : []),
    ...(isDefined(model.dataResidency)
      ? [
          {
            Icon: IconFlag,
            label: t`Data residency`,
            value: (
              <span {...stylex.props(styles.valueText)}>
                {getDataResidencyDisplay(model.dataResidency)}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div {...stylex.props(styles.hoverCardWrapper)}>
      <SettingsTableCard
        rounded
        items={items}
        gridAutoColumns={`${themeCssVariables.spacing[30]} 1fr`}
      />
    </div>
  );
};
