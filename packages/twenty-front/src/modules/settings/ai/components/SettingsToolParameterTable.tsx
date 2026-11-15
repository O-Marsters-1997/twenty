import { SettingsEmptyPlaceholder } from '@/settings/components/SettingsEmptyPlaceholder';
import { t } from '@lingui/core/macro';
import { type ComponentType } from 'react';
import { isDefined } from 'twenty-shared/utils';

import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import {
  IconInfoCircle,
  IllustrationIconArray,
  IllustrationIconCalendarEvent,
  IllustrationIconCalendarTime,
  IllustrationIconJson,
  IllustrationIconNumbers,
  IllustrationIconText,
  IllustrationIconToggle,
} from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type SchemaProperty = {
  type?: string;
  description?: string;
  format?: string;
  items?: { type?: string };
};

export type SettingsToolParameterTableProps = {
  schemaProperties: Record<string, SchemaProperty>;
  requiredFields?: string[];
};

const PARAMETER_TABLE_GRID = '140px 1fr 80px 24px';

const TYPE_ICON_MAP: Record<string, ComponentType<{ size?: number }>> = {
  string: IllustrationIconText,
  date: IllustrationIconCalendarEvent,
  'date-time': IllustrationIconCalendarTime,
  number: IllustrationIconNumbers,
  integer: IllustrationIconNumbers,
  boolean: IllustrationIconToggle,
  array: IllustrationIconArray,
  object: IllustrationIconJson,
};

const styles = stylex.create({
  infoIcon: {
    cursor: 'pointer',
    outline: 'none',
  },
  tableHeaderRow: {
    marginBottom: spacing['--t-spacing-2'],
  },
  fieldsContainer: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: borderColor['--t-border-color-light'],
    paddingBottom: spacing['--t-spacing-2'],
  },
  infoIconContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
});

const getDisplayType = (property: SchemaProperty): string => {
  if (property.format) {
    return property.format;
  }

  if (property.type === 'array' && property.items?.type) {
    return `${property.items.type}[]`;
  }

  return property.type ?? '';
};

const getTypeIconKey = (property: SchemaProperty): string =>
  isDefined(property.format) && isDefined(TYPE_ICON_MAP[property.format])
    ? property.format
    : (property.type ?? '');

export const SettingsToolParameterTable = ({
  schemaProperties,
  requiredFields,
}: SettingsToolParameterTableProps) => {
  const theme = useTheme();
  const entries = Object.entries(schemaProperties);

  if (entries.length === 0) {
    return (
      <SettingsEmptyPlaceholder>{t`No parameters`}</SettingsEmptyPlaceholder>
    );
  }

  return (
    <Table>
      {entries.length > 0 && (
        <>
          <div {...stylex.props(styles.tableHeaderRow)}>
            <TableRow gridTemplateColumns={PARAMETER_TABLE_GRID}>
              <TableHeader>{t`Name`}</TableHeader>
              <TableHeader>{t`Type`}</TableHeader>
              <TableHeader>{t`Required`}</TableHeader>
              <TableHeader />
            </TableRow>
          </div>
          <div {...stylex.props(styles.fieldsContainer)}>
            {entries.map(([paramName, property], index) => {
              const infoIconId = `param-info-${index}`;
              const displayType = getDisplayType(property);
              const TypeIcon = TYPE_ICON_MAP[getTypeIconKey(property)];

              return (
                <TableRow
                  key={paramName}
                  gridTemplateColumns={PARAMETER_TABLE_GRID}
                >
                  <TableCell
                    color={themeCssVariables.font.color.primary}
                    overflow="hidden"
                    textOverflow="ellipsis"
                    whiteSpace="nowrap"
                  >
                    <OverflowingTextWithTooltip text={paramName} />
                  </TableCell>
                  <TableCell gap={themeCssVariables.spacing[1]}>
                    {isDefined(TypeIcon) && (
                      <TypeIcon size={theme.icon.size.md} />
                    )}
                    {displayType}
                  </TableCell>
                  <TableCell color={themeCssVariables.font.color.tertiary}>
                    {requiredFields?.includes(paramName) ? t`Yes` : ''}
                  </TableCell>
                  <TableCell>
                    {property.description && (
                      <div {...stylex.props(styles.infoIconContainer)}>
                        <Tooltip
                          content={property.description}
                          sideOffset={5}
                          side="bottom"
                          positionMethod="fixed"
                          delay={TooltipDelay.shortDelay}
                        >
                          <IconInfoCircle
                            id={infoIconId}
                            size={theme.icon.size.md}
                            color={theme.font.color.tertiary}
                            {...stylex.props(styles.infoIcon)}
                          />
                        </Tooltip>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </div>
        </>
      )}
    </Table>
  );
};
