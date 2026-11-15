import { IconAlignCenter, IconAlignLeft, IconAlignRight } from 'twenty-ui/icon';

import { EmailFieldLabel } from '@/side-panel/pages/email-block-settings/components/EmailFieldLabel';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  alignRow: {
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  alignButton: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    cursor: 'pointer',
    display: 'flex',
    height: '28px',
    justifyContent: 'center',
    padding: 0,
    width: '32px',
  },
  alignButtonActive: {
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-medium'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderColor: borderColor['--t-border-color-strong'],
    color: fontColor['--t-font-color-primary'],
  },
});

const CAMPAIGN_ALIGN_OPTIONS = [
  { align: 'left', Icon: IconAlignLeft },
  { align: 'center', Icon: IconAlignCenter },
  { align: 'right', Icon: IconAlignRight },
] as const;

type EmailAlignmentInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export const EmailAlignmentInput = ({
  label,
  value,
  onChange,
}: EmailAlignmentInputProps) => (
  <div>
    <EmailFieldLabel>{label}</EmailFieldLabel>
    <div {...stylex.props(styles.alignRow)}>
      {CAMPAIGN_ALIGN_OPTIONS.map(({ align, Icon }) => (
        <button
          key={align}
          type="button"
          aria-label={align}
          aria-pressed={value === align}
          title={align}
          {...stylex.props(
            styles.alignButton,
            value === align && styles.alignButtonActive,
          )}
          onClick={() => onChange(align)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  </div>
);
