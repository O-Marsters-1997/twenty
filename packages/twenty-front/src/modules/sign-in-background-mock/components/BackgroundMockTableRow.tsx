import { type BackgroundMockCompany } from '@/sign-in-background-mock/constants/BackgroundMockCompanies';
import { BACKGROUND_MOCK_COLUMN_WIDTHS } from '@/sign-in-background-mock/constants/BackgroundMockColumnWidths';
import { BACKGROUND_MOCK_TABLE_DIMENSIONS } from '@/sign-in-background-mock/constants/BackgroundMockTableDimensions';
import { getAbsoluteImageUrl } from '~/utils/image/getAbsoluteImageUrl';
import { Avatar, Chip } from 'twenty-ui/primitives/data-display';
import { Checkbox } from 'twenty-ui/primitives/input';
import { IconLink } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { getLogoUrlFromDomainName } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { borderColor, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  truncated: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  row: {
    display: 'flex',
  },
  dragHandleColumn: {
    flexShrink: '0',
  },
  checkboxColumn: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'center',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    paddingRight: spacing['--t-spacing-1'],
  },
  cell: {
    overflow: 'hidden',
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flexShrink: '0',
    whiteSpace: 'nowrap',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    borderRightColor: borderColor['--t-border-color-light'],
    borderRightStyle: 'solid',
    borderRightWidth: '1px',
    paddingLeft: spacing['--t-spacing-2'],
  },
  lastEmptyCell: {
    flex: '1',
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  height: (height: number) => ({ height }),
  width: (width: number) => ({ width }),
  minWidth: (minWidth: number) => ({ minWidth }),
  mutedText: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-tertiary'],
    textOverflow: 'ellipsis',
  },
});

const ROW_HEIGHT = BACKGROUND_MOCK_TABLE_DIMENSIONS.rowHeight;

type BackgroundMockTableRowProps = {
  company: BackgroundMockCompany;
};

const formatNumber = (value: number) => value.toLocaleString('en-US');

const PersonChip = ({ fullName }: { fullName: string | null }) => {
  if (fullName === null) {
    return null;
  }

  return (
    <Chip
      size="sm"
      variant="ghost"
      color="primary"
      startElement={
        <Avatar shape="circle" name={fullName} colorSeed={fullName} size="md" />
      }
      style={{ paddingInlineStart: 0 }}
    >
      {fullName}
    </Chip>
  );
};

export const BackgroundMockTableRow = ({
  company,
}: BackgroundMockTableRowProps) => {
  const theme = useTheme();

  const logoUrl = getLogoUrlFromDomainName(company.domainName);

  return (
    <div {...stylex.props(styles.row, styles.height(ROW_HEIGHT))}>
      <div
        {...stylex.props(
          styles.dragHandleColumn,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_TABLE_DIMENSIONS.dragHandleColumnWidth),
        )}
      />
      <div
        {...stylex.props(
          styles.checkboxColumn,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_TABLE_DIMENSIONS.checkboxColumnWidth),
        )}
      >
        <Checkbox hoverable checked={false} />
      </div>
      <div
        {...stylex.props(
          styles.cell,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_COLUMN_WIDTHS.Name),
        )}
      >
        <Chip
          size="sm"
          variant="ghost"
          color="primary"
          startElement={
            <Avatar
              shape="square"
              src={getAbsoluteImageUrl(logoUrl)}
              name={company.name}
              colorSeed={company.id}
              size="md"
            />
          }
          style={{ paddingInlineStart: 0 }}
        >
          {company.name}
        </Chip>
      </div>
      <div
        {...stylex.props(
          styles.cell,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_COLUMN_WIDTHS.Domain),
        )}
      >
        <Chip
          size="sm"
          variant="ghost"
          color="secondary"
          weight="medium"
          startElement={
            <IconLink
              size={theme.icon.size.sm}
              stroke={theme.icon.stroke.sm}
              color={theme.font.color.tertiary}
            />
          }
          style={{ paddingInlineStart: 0 }}
        >
          {company.domainName}
        </Chip>
      </div>
      <div
        {...stylex.props(
          styles.cell,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_COLUMN_WIDTHS['Created by']),
        )}
      >
        <PersonChip fullName={company.createdBy} />
      </div>
      <div
        {...stylex.props(
          styles.cell,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_COLUMN_WIDTHS['Account Owner']),
        )}
      >
        <PersonChip fullName={company.accountOwner} />
      </div>
      <div
        {...stylex.props(
          styles.cell,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_COLUMN_WIDTHS['Creation date']),
        )}
      >
        <span {...stylex.props(styles.mutedText)}>{company.creationDate}</span>
      </div>
      <div
        {...stylex.props(
          styles.cell,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_COLUMN_WIDTHS.Employees),
        )}
      >
        <span {...stylex.props(styles.truncated)}>
          {formatNumber(company.employees)}
        </span>
      </div>
      <div
        {...stylex.props(
          styles.cell,
          styles.height(ROW_HEIGHT),
          styles.width(BACKGROUND_MOCK_COLUMN_WIDTHS.Address),
        )}
      >
        <span {...stylex.props(styles.truncated)}>{company.address}</span>
      </div>
      <div
        {...stylex.props(
          styles.lastEmptyCell,
          styles.height(ROW_HEIGHT),
          styles.minWidth(
            BACKGROUND_MOCK_TABLE_DIMENSIONS.addColumnButtonWidth,
          ),
        )}
      />
    </div>
  );
};
