import { styled } from '@linaria/react';

import { BackgroundMockTableRow } from '@/sign-in-background-mock/components/BackgroundMockTableRow';
import { BACKGROUND_MOCK_COLUMNS } from '@/sign-in-background-mock/constants/BackgroundMockColumns';
import { BACKGROUND_MOCK_COMPANIES } from '@/sign-in-background-mock/constants/BackgroundMockCompanies';
import { BACKGROUND_MOCK_TABLE_DIMENSIONS } from '@/sign-in-background-mock/constants/BackgroundMockTableDimensions';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconChevronDown, IconPlus, useIcons } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

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
});

const StyledHeaderRow = styled.div`
  background: ${themeCssVariables.background.primary};
  display: flex;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
`;

const StyledDragHandleColumn = styled.div`
  background: ${themeCssVariables.background.primary};
  flex-shrink: 0;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  width: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.dragHandleColumnWidth}px;
`;

const StyledCheckboxHeaderColumn = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  display: flex;
  flex-shrink: 0;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  justify-content: center;
  padding-right: ${themeCssVariables.spacing[1]};
  width: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.checkboxColumnWidth}px;
`;

const StyledHeaderCell = styled.div<{ width: number }>`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  border-right: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  overflow: hidden;
  padding: 0 ${themeCssVariables.spacing[2]};
  width: ${({ width }) => width}px;
`;

const StyledAddColumnHeaderCell = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex: 1;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  min-width: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.addColumnButtonWidth}px;
`;

const StyledAddColumnIconWrapper = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  justify-content: center;
  width: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.addColumnButtonWidth}px;
`;

const StyledFooterRow = styled.div`
  display: flex;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
`;

const StyledFooterCheckboxColumn = styled.div`
  flex-shrink: 0;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  width: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.checkboxColumnWidth}px;
`;

const StyledFooterCell = styled.div<{ width: number }>`
  align-items: center;
  box-sizing: border-box;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  flex-shrink: 0;
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  justify-content: space-between;
  overflow: hidden;
  padding: 0 ${themeCssVariables.spacing[2]};
  white-space: nowrap;
  width: ${({ width }) => width}px;
`;

const StyledLastEmptyCell = styled.div`
  flex: 1;
  height: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight}px;
  min-width: ${BACKGROUND_MOCK_TABLE_DIMENSIONS.addColumnButtonWidth}px;
`;

export const BackgroundMockTable = () => {
  const theme = useTheme();
  const { getIcon } = useIcons();

  return (
    <div {...stylex.props(styles.tableWrapper)}>
      <div {...stylex.props(styles.table)}>
        <StyledHeaderRow>
          <StyledDragHandleColumn />
          <StyledCheckboxHeaderColumn>
            <Checkbox hoverable checked={false} />
          </StyledCheckboxHeaderColumn>
          {BACKGROUND_MOCK_COLUMNS.map((column) => {
            const Icon = getIcon(column.iconName);
            return (
              <StyledHeaderCell key={column.label} width={column.width}>
                {Icon !== undefined && (
                  <Icon
                    size={theme.icon.size.md}
                    stroke={theme.icon.stroke.sm}
                  />
                )}
                <span {...stylex.props(styles.headerLabel)}>{column.label}</span>
              </StyledHeaderCell>
            );
          })}
          <StyledAddColumnHeaderCell>
            <StyledAddColumnIconWrapper>
              <IconPlus
                size={theme.icon.size.sm}
                stroke={theme.icon.stroke.sm}
              />
            </StyledAddColumnIconWrapper>
          </StyledAddColumnHeaderCell>
        </StyledHeaderRow>
        <div {...stylex.props(styles.tableBody)}>
          {BACKGROUND_MOCK_COMPANIES.map((company) => (
            <BackgroundMockTableRow key={company.id} company={company} />
          ))}
        </div>
        <StyledFooterRow>
          <StyledDragHandleColumn />
          <StyledFooterCheckboxColumn />
          <StyledFooterCell width={BACKGROUND_MOCK_COLUMNS[0].width}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Calculate" />
            </div>
            <IconChevronDown
              size={theme.icon.size.sm}
              stroke={theme.icon.stroke.sm}
            />
          </StyledFooterCell>
          <StyledFooterCell width={BACKGROUND_MOCK_COLUMNS[1].width}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Count all" />
            </div>
            <span {...stylex.props(styles.footerValue)}>599</span>
          </StyledFooterCell>
          <StyledFooterCell width={BACKGROUND_MOCK_COLUMNS[2].width} />
          <StyledFooterCell width={BACKGROUND_MOCK_COLUMNS[3].width} />
          <StyledFooterCell width={BACKGROUND_MOCK_COLUMNS[4].width} />
          <StyledFooterCell width={BACKGROUND_MOCK_COLUMNS[5].width}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Max of Employees" />
            </div>
            <span {...stylex.props(styles.footerValue)}>284,571</span>
          </StyledFooterCell>
          <StyledFooterCell width={BACKGROUND_MOCK_COLUMNS[6].width}>
            <div {...stylex.props(styles.footerLabel)}>
              <OverflowingTextWithTooltip text="Not empty of Address" />
            </div>
            <span {...stylex.props(styles.footerValue)}>599</span>
          </StyledFooterCell>
          <StyledLastEmptyCell />
        </StyledFooterRow>
      </div>
    </div>
  );
};
