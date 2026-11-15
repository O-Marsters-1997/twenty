import * as stylex from '@stylexjs/stylex';
import { IconPlus } from 'twenty-ui/icon';
import {
  backgroundTransparent,
  borderColor,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

import { CORE_OBJECT_TABLE_CHECKBOX_COLUMN_GRID_TRACK } from '@/object-core/constants/CoreObjectTableCheckboxColumnGridTrack';

const styles = stylex.create({
  addNewRow: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderStyle: 'none',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-8'],
    paddingBlock: 0,
    paddingInlineEnd: spacing['--t-spacing-2'],
    width: '100%',
  },
  paddingInlineStart: (track: string) => ({
    paddingInlineStart: `calc(${track} + ${spacing['--t-spacing-2']})`,
  }),
  enabled: {
    cursor: 'pointer',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
  },
});

type CoreObjectTableAddNewRowProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

export const CoreObjectTableAddNewRow = ({
  label,
  onClick,
  disabled = false,
}: CoreObjectTableAddNewRowProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    {...stylex.props(
      styles.addNewRow,
      styles.paddingInlineStart(CORE_OBJECT_TABLE_CHECKBOX_COLUMN_GRID_TRACK),
      !disabled && styles.enabled,
    )}
  >
    <IconPlus size={14} />
    {label}
  </button>
);
