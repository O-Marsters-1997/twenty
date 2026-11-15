import { type ReactNode } from 'react';
import { type IconComponent, IconX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import {
  accent,
  background,
  borderColor,
  borderRadius,
  color,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  icon: {
    alignItems: 'center',
    display: 'flex',
  },
  labelKey: {
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  filterValue: {
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  sortValue: {
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  subFieldSeparator: {
    fontWeight: fontWeight['--t-font-weight-regular'],
    opacity: '0.6',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
  subFieldValue: {
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  keyLabelContainer: {
    display: 'flex',
  },
  chip: {
    alignItems: 'center',
    borderRadius: borderRadius['--t-border-radius-sm-round'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'border-box',
    columnGap: spacing['--t-spacing-1'],
    cornerShape: 'round',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    height: '24px',
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-0_5'],
    paddingTop: spacing['--t-spacing-0_5'],
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  chipDefault: {
    backgroundColor: accent['--t-accent-quaternary'],
    borderColor: accent['--t-accent-tertiary'],
    color: color['--t-color-blue'],
  },
  chipDanger: {
    backgroundColor: background['--t-background-danger'],
    borderColor: borderColor['--t-border-color-danger'],
    color: color['--t-color-red'],
  },
  delete: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    boxSizing: 'border-box',
    color: 'inherit',
    cornerShape: 'round',
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    height: '20px',
    justifyContent: 'center',
    margin: 0,
    padding: 0,
    userSelect: 'none',
    width: '20px',
  },
  deleteHoverDefault: {
    backgroundColor: {
      default: null,
      ':hover': accent['--t-accent-secondary'],
    },
    borderRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm-round'],
    },
  },
  deleteHoverDanger: {
    backgroundColor: { default: null, ':hover': color['--t-color-red5'] },
    borderRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm-round'],
    },
  },
});

export type SortOrFilterChipVariant = 'default' | 'danger';

export type SortOrFilterChipType = 'sort' | 'filter';

type SortOrFilterChipProps = {
  labelKey?: string;
  labelValue: string;
  labelSubField?: ReactNode;
  variant?: SortOrFilterChipVariant;
  Icon?: IconComponent;
  onRemove: () => void;
  onClick?: () => void;
  testId?: string;
  type: SortOrFilterChipType;
};

export const SortOrFilterChip = ({
  labelKey,
  labelValue,
  labelSubField,
  variant = 'default',
  Icon,
  onRemove,
  testId,
  onClick,
  type,
}: SortOrFilterChipProps) => {
  const theme = useTheme();

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <div
      onClick={onClick}
      {...stylex.props(
        styles.chip,
        variant === 'danger' ? styles.chipDanger : styles.chipDefault,
      )}
    >
      {Icon && (
        <div {...stylex.props(styles.icon)}>
          <Icon size={theme.icon.size.sm} />
        </div>
      )}
      <div {...stylex.props(styles.keyLabelContainer)}>
        {labelKey && <div {...stylex.props(styles.labelKey)}>{labelKey}</div>}
        {type === 'sort' ? (
          <span {...stylex.props(styles.sortValue)}>{labelValue}</span>
        ) : (
          <span {...stylex.props(styles.filterValue)}>{labelValue}</span>
        )}
        {isDefined(labelSubField) && (
          <>
            <span {...stylex.props(styles.subFieldSeparator)}>·</span>
            <span {...stylex.props(styles.subFieldValue)}>{labelSubField}</span>
          </>
        )}
      </div>
      <button
        {...stylex.props(
          styles.delete,
          variant === 'danger'
            ? styles.deleteHoverDanger
            : styles.deleteHoverDefault,
        )}
        onClick={handleDeleteClick}
        data-testid={'remove-icon-' + testId}
      >
        <IconX size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />
      </button>
    </div>
  );
};
