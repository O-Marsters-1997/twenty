import { parseCssSizeValue } from '@/advanced-text-editor/utils/parseCssSizeValue';
import { EmailFieldLabel } from '@/side-panel/pages/email-block-settings/components/EmailFieldLabel';
import { TextInput } from '@/ui/input/components/TextInput';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  grow: {
    flex: '1',
  },
  unitSelect: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    height: '32px',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
});

const SIZE_UNITS = ['px', '%', 'em'] as const;

type EmailSizeInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const EmailSizeInput = ({
  label,
  value,
  onChange,
  placeholder,
}: EmailSizeInputProps) => {
  const { amount, unit } = parseCssSizeValue(value);
  const displayedAmount = amount === '' ? value.trim() : amount;

  const commit = (nextAmount: string, nextUnit: string) => {
    const trimmedAmount = nextAmount.trim();

    if (trimmedAmount === '') {
      onChange('');
      return;
    }

    if (!/^-?(\d+|\d*\.\d+)$/.test(trimmedAmount)) {
      onChange(trimmedAmount);
      return;
    }

    onChange(`${trimmedAmount}${nextUnit}`);
  };

  return (
    <div>
      <EmailFieldLabel>{label}</EmailFieldLabel>
      <div {...stylex.props(styles.row)}>
        <div {...stylex.props(styles.grow)}>
          <TextInput
            value={displayedAmount}
            onChange={(nextAmount) => commit(nextAmount, unit)}
            placeholder={placeholder ?? '0'}
            fullWidth
          />
        </div>
        <select
          value={unit}
          onChange={(event) => commit(displayedAmount, event.target.value)}
          {...stylex.props(styles.unitSelect)}
        >
          {SIZE_UNITS.map((sizeUnit) => (
            <option key={sizeUnit} value={sizeUnit}>
              {sizeUnit}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
