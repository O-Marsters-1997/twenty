import { Fragment } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

export type SettingsStatRow = {
  Icon: IconComponent;
  label: string;
  value: string;
};

type SettingsStatsGridProps = {
  columns: SettingsStatRow[][];
};

const styles = stylex.create({
  container: {
    background: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
  column: {
    display: 'flex',
    flex: '1 1 0',
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    minWidth: '0',
  },
  divider: {
    alignSelf: 'stretch',
    background: borderColor['--t-border-color-light'],
    width: '1px',
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    height: spacing['--t-spacing-6'],
  },
  label: {
    color: fontColor['--t-font-color-tertiary'],
    flex: '1 1 0',
    fontSize: fontSize['--t-font-size-sm'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  value: {
    color: fontColor['--t-font-color-primary'],
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
});

type StatRowProps = SettingsStatRow;

const StatRow = ({ Icon, label, value }: StatRowProps) => {
  const theme = useTheme();
  return (
    <div {...stylex.props(styles.row)}>
      <Icon size={theme.icon.size.md} color={theme.font.color.tertiary} />
      <div {...stylex.props(styles.label)}>{label}</div>
      <div {...stylex.props(styles.value)}>{value}</div>
    </div>
  );
};

export const SettingsStatsGrid = ({ columns }: SettingsStatsGridProps) => (
  <div {...stylex.props(styles.container)}>
    {columns.map((column, index) => (
      <Fragment key={index}>
        {index > 0 && <div {...stylex.props(styles.divider)} />}
        <div {...stylex.props(styles.column)}>
          {column.map((stat) => (
            <StatRow
              key={stat.label}
              Icon={stat.Icon}
              label={stat.label}
              value={stat.value}
            />
          ))}
        </div>
      </Fragment>
    ))}
  </div>
);
