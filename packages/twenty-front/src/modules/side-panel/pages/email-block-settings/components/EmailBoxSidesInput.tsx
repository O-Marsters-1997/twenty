import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconFrame, IconSquare } from 'twenty-ui/icon';

import { EmailFieldLabel } from '@/side-panel/pages/email-block-settings/components/EmailFieldLabel';
import { TextInput } from '@/ui/input/components/TextInput';
import * as stylex from '@stylexjs/stylex';
import { borderColor, borderRadius, fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
  },
  grow: {
    flex: '1',
  },
  sidesGrid: {
    display: 'grid',
    gap: spacing['--t-spacing-1'],
    gridTemplateColumns: 'repeat(4, 1fr)',
    marginTop: spacing['--t-spacing-1'],
  },
  unitChip: {
    alignItems: 'center',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-sm'],
    height: '32px',
    paddingTop: '0',
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
  },
});

const SIDE_KEYS = ['top', 'right', 'bottom', 'left'] as const;

const SIDE_PLACEHOLDERS: Record<(typeof SIDE_KEYS)[number], string> = {
  top: 'T',
  right: 'R',
  bottom: 'B',
  left: 'L',
};

const toDisplayAmount = (token: string): string =>
  token.endsWith('px') && !Number.isNaN(Number(token.slice(0, -2)))
    ? token.slice(0, -2)
    : token;

const toCssToken = (input: string): string => {
  const trimmed = input.trim();

  if (trimmed === '') {
    return '0px';
  }

  return Number.isNaN(Number(trimmed)) ? trimmed : `${trimmed}px`;
};

const areAllSidesEqual = ({ top, right, bottom, left }: CssBoxSides) =>
  top === right && right === bottom && bottom === left;

export type CssBoxSides = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

type EmailBoxSidesInputProps = {
  label: string;
  sides: CssBoxSides;
  onChange: (sides: CssBoxSides) => void;
  placeholder?: string;
};

export const EmailBoxSidesInput = ({
  label,
  sides,
  onChange,
  placeholder,
}: EmailBoxSidesInputProps) => {
  const { t } = useLingui();
  const [isPerSide, setIsPerSide] = useState(!areAllSidesEqual(sides));

  const commitAllSides = (input: string) => {
    const token = input.trim() === '' ? '' : toCssToken(input);

    onChange({ top: token, right: token, bottom: token, left: token });
  };

  const commitSide = (side: (typeof SIDE_KEYS)[number], input: string) => {
    onChange({
      ...sides,
      [side]: input.trim() === '' ? '' : toCssToken(input),
    });
  };

  return (
    <div>
      <EmailFieldLabel>{label}</EmailFieldLabel>
      <div {...stylex.props(styles.row)}>
        <div {...stylex.props(styles.grow)}>
          {isPerSide ? (
            <div {...stylex.props(styles.sidesGrid)}>
              {SIDE_KEYS.map((side) => (
                <TextInput
                  key={side}
                  value={toDisplayAmount(sides[side])}
                  onChange={(input) => commitSide(side, input)}
                  placeholder={SIDE_PLACEHOLDERS[side]}
                  fullWidth
                />
              ))}
            </div>
          ) : (
            <TextInput
              value={toDisplayAmount(sides.top)}
              onChange={commitAllSides}
              placeholder={placeholder ?? '0'}
              fullWidth
            />
          )}
        </div>
        <div {...stylex.props(styles.unitChip)}>px</div>
        <LightIconButton
          size="sm"
          emphasis={isPerSide ? 'subtle' : 'standard'}
          title={t`Same value on every side`}
          aria-pressed={!isPerSide}
          onClick={() => {
            setIsPerSide(false);
            commitAllSides(toDisplayAmount(sides.top));
          }}
          aria-label={t`Same value on every side`}
        >
          <IconSquare />
        </LightIconButton>
        <LightIconButton
          size="sm"
          emphasis={isPerSide ? 'standard' : 'subtle'}
          title={t`Edit each side`}
          aria-pressed={isPerSide}
          onClick={() => setIsPerSide(true)}
          aria-label={t`Edit each side`}
        >
          <IconFrame />
        </LightIconButton>
      </div>
    </div>
  );
};
