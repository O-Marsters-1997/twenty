import { EmailFieldLabel } from '@/side-panel/pages/email-block-settings/components/EmailFieldLabel';
import { TextInput } from '@/ui/input/components/TextInput';
import * as stylex from '@stylexjs/stylex';
import {
  borderColor,
  borderRadius,
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
  colorSwatchInput: {
    background: 'none',
    borderWidth: '1px',
    borderStyle: { default: 'solid', '::-webkit-color-swatch': 'none' },
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: { default: borderRadius['--t-border-radius-sm'], '::-webkit-color-swatch': borderRadius['--t-border-radius-xs'] },
    borderTopRightRadius: { default: borderRadius['--t-border-radius-sm'], '::-webkit-color-swatch': borderRadius['--t-border-radius-xs'] },
    borderBottomRightRadius: { default: borderRadius['--t-border-radius-sm'], '::-webkit-color-swatch': borderRadius['--t-border-radius-xs'] },
    borderBottomLeftRadius: { default: borderRadius['--t-border-radius-sm'], '::-webkit-color-swatch': borderRadius['--t-border-radius-xs'] },
    boxSizing: 'border-box',
    cursor: 'pointer',
    flexShrink: '0',
    height: '32px',
    paddingTop: { default: '2px', '::-webkit-color-swatch-wrapper': '0' },
    paddingRight: { default: '2px', '::-webkit-color-swatch-wrapper': '0' },
    paddingBottom: { default: '2px', '::-webkit-color-swatch-wrapper': '0' },
    paddingLeft: { default: '2px', '::-webkit-color-swatch-wrapper': '0' },
    width: '32px',
  },
});

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

// oxlint-disable-next-line twenty/no-hardcoded-colors
const COLOR_SWATCH_FALLBACK = '#ffffff';

type EmailColorInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export const EmailColorInput = ({
  label,
  value,
  onChange,
  placeholder,
}: EmailColorInputProps) => {
  return (
    <div>
      <EmailFieldLabel>{label}</EmailFieldLabel>
      <div {...stylex.props(styles.row)}>
        <input
          type="color"
          value={HEX_COLOR_PATTERN.test(value) ? value : COLOR_SWATCH_FALLBACK}
          onChange={(event) => onChange(event.target.value)}
          {...stylex.props(styles.colorSwatchInput)}
        />
        <div {...stylex.props(styles.grow)}>
          <TextInput
            value={value}
            onChange={onChange}
            placeholder={placeholder ?? COLOR_SWATCH_FALLBACK}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
};
