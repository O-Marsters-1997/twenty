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
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingTop: '0',
  },
  subFieldValue: {
    fontWeight: fontWeight['--t-font-weight-regular'],
  },
  keyLabelContainer: {
    display: 'flex',
  },
  chip: {
    borderRadius: borderRadius['--t-border-radius-sm-round'],
    borderStyle: 'solid',
    borderWidth: '1px',
    cornerShape: 'round',
    alignItems: 'center',
    boxSizing: 'border-box',
    columnGap: spacing['--t-spacing-1'],
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'row',
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    userSelect: 'none',
    whiteSpace: 'nowrap',
    height: '24px',
    paddingBottom: spacing['--t-spacing-0_5'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-0_5'],
    paddingTop: spacing['--t-spacing-0_5'],
  },
  chipDefault: {
    borderColor: accent['--t-accent-tertiary'],
    backgroundColor: accent['--t-accent-quaternary'],
    color: color['--t-color-blue'],
  },
  chipDanger: {
    borderColor: borderColor['--t-border-color-danger'],
    backgroundColor: background['--t-background-danger'],
    color: color['--t-color-red'],
  },
  delete: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    cornerShape: 'round',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxSizing: 'border-box',
    color: 'inherit',
    cursor: 'pointer',
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    justifyContent: 'center',
    userSelect: 'none',
    height: '20px',
    width: '20px',
  },
  deleteHoverDefault: {
    borderRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm-round'],
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': accent['--t-accent-secondary'],
    },
  },
  deleteHoverDanger: {
    borderRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm-round'],
    },
    backgroundColor: {
      default: 'transparent',
      ':hover': color['--t-color-red5'],
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
