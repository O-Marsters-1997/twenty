import { t } from '@lingui/core/macro';
import { useRef, useState } from 'react';

import { Trans } from '@lingui/react/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconTrash } from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { Checkbox } from 'twenty-ui/primitives/input';
import { IconButton } from 'twenty-ui/components/input';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';

import { SettingsAiModelHoverCard } from '@/settings/ai/components/SettingsAiModelHoverCard';
import { type AiModelSummary } from '@/settings/ai/types/AiModelSummary';
import { getModelIcon } from '@/ai/utils/getModelIcon';
import { Table } from '@/ui/layout/table/components/Table';
import { TableBody } from '@/ui/layout/table/components/TableBody';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import * as stylex from '@stylexjs/stylex';
import { spacing, font, background, border } from 'twenty-ui/theme/tokens.stylex';

const GRID_COLUMNS = '1fr 120px 40px';
const GRID_COLUMNS_WITHOUT_PROVIDER = '1fr 40px';
const GRID_COLUMNS_WITH_REMOVE = '1fr 120px 40px 32px';
const GRID_COLUMNS_WITH_REMOVE_WITHOUT_PROVIDER = '1fr 40px 32px';

const styles = stylex.create({
  modelNameCell: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    overflow: 'hidden',
  },
  modelLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deprecatedSuffix: {
    color: font['--t-font-color-light'],
  },
  kindBadge: {
    background: background['--t-background-transparent-light'],
    borderTopLeftRadius: border['--t-border-radius-sm'],
    borderTopRightRadius: border['--t-border-radius-sm'],
    borderBottomRightRadius: border['--t-border-radius-sm'],
    borderBottomLeftRadius: border['--t-border-radius-sm'],
    color: font['--t-font-color-tertiary'],
    flexShrink: '0',
    fontSize: font['--t-font-size-xs'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
  hoverCardTooltipClass: {
    borderTopLeftRadius: border['--t-border-radius-rounded'],
    borderTopRightRadius: border['--t-border-radius-rounded'],
    borderBottomRightRadius: border['--t-border-radius-rounded'],
    borderBottomLeftRadius: border['--t-border-radius-rounded'],
    cornerShape: 'round',
    paddingTop: '0',
    paddingRight: '0',
    paddingBottom: '0',
    paddingLeft: '0',
  },
});

// Evaluation models can't chat or run agents, so their rows are badged apart.
const sanitizeIdForSelector = (id: string): string =>
  id.replace(/[^a-zA-Z0-9-_]/g, '_');

const getProviderDisplayLabel = (model: AiModelSummary): string =>
  model.providerLabel ?? model.providerName ?? '';

type SettingsAiModelsTableProps<TModel extends AiModelSummary> = {
  models: TModel[];
  isChecked: (model: TModel) => boolean;
  isDisabled?: (model: TModel) => boolean;
  onToggle: (modelId: string, isCurrentlyChecked: boolean) => void;
  onToggleAll?: (shouldCheckAll: boolean) => void;
  onRemove?: (model: TModel) => void;
  showProviderColumn?: boolean;
  anchorPrefix?: string;
};

export const SettingsAiModelsTable = <TModel extends AiModelSummary>({
  models,
  isChecked,
  isDisabled,
  onToggle,
  onToggleAll,
  onRemove,
  showProviderColumn = true,
  anchorPrefix,
}: SettingsAiModelsTableProps<TModel>) => {
  const hoveredRowRef = useRef<HTMLDivElement>(null);
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);
  const theme = useTheme();

  const hoveredModel = models.find((model) => model.modelId === hoveredModelId);
  const hasRemove = isDefined(onRemove);
  const gridColumns = hasRemove
    ? showProviderColumn
      ? GRID_COLUMNS_WITH_REMOVE
      : GRID_COLUMNS_WITH_REMOVE_WITHOUT_PROVIDER
    : showProviderColumn
      ? GRID_COLUMNS
      : GRID_COLUMNS_WITHOUT_PROVIDER;

  const toggleableModels = models.filter(
    (model) => !(isDisabled?.(model) ?? false),
  );
  const checkedCount = toggleableModels.filter((model) =>
    isChecked(model),
  ).length;
  const allChecked =
    toggleableModels.length > 0 && checkedCount === toggleableModels.length;
  const noneChecked = checkedCount === 0;

  return (
    <>
      <Table>
        <TableRow gridTemplateColumns={gridColumns}>
          <TableHeader>
            <Trans>Name</Trans>
          </TableHeader>
          {showProviderColumn && (
            <TableHeader align="right">
              <Trans>Provider</Trans>
            </TableHeader>
          )}
          <TableHeader align="right">
            {isDefined(onToggleAll) && (
              <Checkbox
                checked={allChecked}
                indeterminate={!allChecked && !noneChecked}
                onCheckedChange={() => onToggleAll(!allChecked)}
              />
            )}
          </TableHeader>
          {hasRemove && <TableHeader />}
        </TableRow>
        <TableBody>
          {models.map((model) => {
            const ModelIcon = getModelIcon(
              model.modelFamily,
              model.providerName,
            );
            const safeId = sanitizeIdForSelector(model.modelId);
            const checked = isChecked(model);
            const disabled = isDisabled?.(model) ?? false;

            return (
              <TableRow
                key={model.modelId}
                id={anchorPrefix ? `${anchorPrefix}-${safeId}` : undefined}
                gridTemplateColumns={gridColumns}
                onMouseEnter={
                  anchorPrefix
                    ? (event) => {
                        hoveredRowRef.current = event.currentTarget;
                        setHoveredModelId(model.modelId);
                      }
                    : undefined
                }
                onMouseLeave={
                  anchorPrefix ? () => setHoveredModelId(null) : undefined
                }
                onClick={
                  disabled ? undefined : () => onToggle(model.modelId, checked)
                }
              >
                <TableCell
                  color={
                    disabled
                      ? themeCssVariables.font.color.light
                      : themeCssVariables.font.color.primary
                  }
                >
                  <div {...stylex.props(styles.modelNameCell)}>
                    <ModelIcon
                      size={theme.icon.size.md}
                      stroke={theme.icon.stroke.sm}
                      color={
                        disabled
                          ? theme.font.color.light
                          : theme.font.color.secondary
                      }
                    />
                    <span {...stylex.props(styles.modelLabel)}>{model.label}</span>
                    {model.kind === 'evaluation' && (
                      <span {...stylex.props(styles.kindBadge)}>
                        <Trans>Evaluation</Trans>
                      </span>
                    )}
                    {disabled && model.isDeprecated && (
                      <span {...stylex.props(styles.deprecatedSuffix)}>
                        · <Trans>Deprecated</Trans>
                      </span>
                    )}
                  </div>
                </TableCell>
                {showProviderColumn && (
                  <TableCell
                    align="right"
                    color={themeCssVariables.font.color.tertiary}
                  >
                    {getProviderDisplayLabel(model)}
                  </TableCell>
                )}
                <TableCell
                  align="right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onCheckedChange={() => onToggle(model.modelId, checked)}
                  />
                </TableCell>
                {hasRemove && (
                  <TableCell align="right">
                    <IconButton
                      aria-label={t`Remove model`}
                      color="danger"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove(model);
                      }}
                    >
                      <IconTrash />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {anchorPrefix && hoveredModel && (
        <Tooltip.Root key={hoveredModel.modelId} open>
          <Tooltip.Portal>
            <Tooltip.Positioner
              anchor={hoveredRowRef}
              side="top"
              align="end"
              sideOffset={8}
              style={{ maxWidth: '320px' }}
            >
              <Tooltip.Popup {...stylex.props(styles.hoverCardTooltipClass)}>
                <SettingsAiModelHoverCard model={hoveredModel} />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      )}
    </>
  );
};
