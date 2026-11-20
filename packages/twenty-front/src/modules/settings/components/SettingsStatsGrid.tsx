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
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  column: {
    flexGrow: '1',
    flexShrink: '1',
    flexBasis: '0',
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    flexDirection: 'column',
    minWidth: '0',
  },
  divider: {
    background: borderColor['--t-border-color-light'],
    alignSelf: 'stretch',
    width: '1px',
  },
  row: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    height: spacing['--t-spacing-6'],
  },
  label: {
    flexGrow: '1',
    flexShrink: '1',
    flexBasis: '0',
    overflow: 'hidden',
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  value: {
    color: fontColor['--t-font-color-primary'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: '0',
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
