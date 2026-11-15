import { BackgroundMockTableRow } from '@/sign-in-background-mock/components/BackgroundMockTableRow';
import { BACKGROUND_MOCK_COLUMNS } from '@/sign-in-background-mock/constants/BackgroundMockColumns';
import { BACKGROUND_MOCK_COMPANIES } from '@/sign-in-background-mock/constants/BackgroundMockCompanies';
import { BACKGROUND_MOCK_TABLE_DIMENSIONS } from '@/sign-in-background-mock/constants/BackgroundMockTableDimensions';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconChevronDown, IconPlus, useIcons } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  tableWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  table: {
    background: background['--t-background-primary'],
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    fontSize: fontSize['--t-font-size-md'],
    overflow: 'hidden',
    position: 'relative',
  },
  headerLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tableBody: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: '0',
  },
  footerLabel: {
    flex: '1',
    minWidth: '0',
  },
  footerValue: {
    color: fontColor['--t-font-color-primary'],
    flexShrink: '0',
  },
  headerRow: {
    background: background['--t-background-primary'],
    display: 'flex',
  },
  dragHandleColumn: {
    flexShrink: '0',
  },
  checkboxHeaderColumn: {
    alignItems: 'center',
    background: background['--t-background-primary'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'center',
    paddingRight: spacing['--t-spacing-1'],
  },
  headerCell: {
    alignItems: 'center',
    background: background['--t-background-primary'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderRightColor: borderColor['--t-border-color-light'],
    borderRightStyle: 'solid',
    borderRightWidth: '1px',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
  },
  addColumnHeaderCell: {
    alignItems: 'center',
    background: background['--t-background-primary'],
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flex: '1',
  },
  addColumnIconWrapper: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'center',
  },
  footerRow: {
    display: 'flex',
  },
  footerCheckboxColumn: {
    flexShrink: '0',
  },
  footerCell: {
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    whiteSpace: 'nowrap',
  },
  lastEmptyCell: {
    flex: '1',
  },
  height: (height: number) => ({ height }),
  width: (width: number) => ({ width }),
  minWidth: (minWidth: number) => ({ minWidth }),
});

const ROW_HEIGHT = BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight;

export const BackgroundMockTable = () => {
  const theme = useTheme();
  const { getIcon } = useIcons();

  return (
    <div {...stylex.props(styles.tableWrapper)}>
      <div {...stylex.props(styles.table)}>
        <div {...stylex.props(styles.headerRow, styles.height(ROW_HEIGHT))}>
          <div
            {...stylex.props(
              styles.dragHandleColumn,
              styles.height(ROW_HEIGHT),
              styles.width(BACKGROUND_MOCK_TABLE_DIMENSIONS.dragHandleColumnWidth),
            )}
          />
          <div
            {...stylex.props(
              styles.checkboxHeaderColumn,
              styles.height(ROW_HEIGHT),
              styles.width(BACKGROUND_MOCK_TABLE_DIMENSIONS.checkboxColumnWidth),
            )}
          >
            <Checkbox hoverable checked={false} />
          </div>
          {BACKGROUND_MOCK_COLUMNS.map((column) => {
            const Icon = getIcon(column.iconName);
            return (
              <div
                key={column.label}
                {...stylex.props(
                  styles.headerCell,
                  styles.height(ROW_HEIGHT),
                  styles.width(column.width),
                )}
              >
                {Icon !== undefined && (
                  <Icon
                    size={theme.icon.size.md}
                    stroke={theme.icon.stroke.sm}
                  />
                )}
                <span {...stylex.props(styles.headerLabel)}>{column.label}</span>
              </div>
            );
          })}
          <div
            {...stylex.props(
              styles.addColumnHeaderCell,
              styles.height(ROW_HEIGHT),
              styles.minWidth(BACKGROUND_MOCK_TABLE_DIMENSIONS.addColumnButtonWidth),
            )}
          >
            <div
              {...stylex.props(
                styles.addColumnIconWrapper,
                styles.height(ROW_HEIGHT),
                styles.width(BACKGROUND_MOCK_TABLE_DIMENSIONS.addColumnButtonWidth),
              )}
            >
              <IconPlus
                size={theme.icon.size.sm}
                stroke={theme.icon.stroke.sm}
              />
            </div>
          </div>
        </div>
        <div {...stylex.props(styles.tableBody)}>
          {BACKGROUND_MOCK_COMPANIES.map((company) => (
            <BackgroundMockTableRow key={company.id} company={company} />
          ))}
        </div>
        <div {...stylex.props(styles.footerRow, styles.height(ROW_HEIGHT))}>
          <div
            {...stylex.props(
              styles.dragHandleColumn,
              styles.height(ROW_HEIGHT),
              styles.width(BACKGROUND_MOCK_TABLE_DIMENSIONS.dragHandleColumnWidth),
            )}
          />
          <div
            {...stylex.props(
              styles.footerCheckboxColumn,
              styles.height(ROW_HEIGHT),
              styles.width(BACKGROUND_MOCK_TABLE_DIMENSIONS.checkboxColumnWidth),
            )}
          />
          <div {...stylex.props(styles.footerCell, styles.height(ROW_HEIGHT), styles.width(BACKGROUND_MOCK_COLUMNS[0].width))}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Calculate" />
            </div>
            <IconChevronDown
              size={theme.icon.size.sm}
              stroke={theme.icon.stroke.sm}
            />
          </div>
          <div {...stylex.props(styles.footerCell, styles.height(ROW_HEIGHT), styles.width(BACKGROUND_MOCK_COLUMNS[1].width))}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Count all" />
            </div>
            <span {...stylex.props(styles.footerValue)}>599</span>
          </div>
          <div {...stylex.props(styles.footerCell, styles.height(ROW_HEIGHT), styles.width(BACKGROUND_MOCK_COLUMNS[2].width))} />
          <div {...stylex.props(styles.footerCell, styles.height(ROW_HEIGHT), styles.width(BACKGROUND_MOCK_COLUMNS[3].width))} />
          <div {...stylex.props(styles.footerCell, styles.height(ROW_HEIGHT), styles.width(BACKGROUND_MOCK_COLUMNS[4].width))} />
          <div {...stylex.props(styles.footerCell, styles.height(ROW_HEIGHT), styles.width(BACKGROUND_MOCK_COLUMNS[5].width))}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Max of Employees" />
            </div>
            <span {...stylex.props(styles.footerValue)}>284,571</span>
          </div>
          <div {...stylex.props(styles.footerCell, styles.height(ROW_HEIGHT), styles.width(BACKGROUND_MOCK_COLUMNS[6].width))}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Not empty of Address" />
            </div>
            <span {...stylex.props(styles.footerValue)}>599</span>
          </div>
          <div
            {...stylex.props(
              styles.lastEmptyCell,
              styles.height(ROW_HEIGHT),
              styles.minWidth(BACKGROUND_MOCK_TABLE_DIMENSIONS.addColumnButtonWidth),
            )}
          />
        </div>
      </div>
    </div>
  );
};
