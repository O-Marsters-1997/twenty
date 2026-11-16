import { useRender } from '@base-ui/react/use-render';
import { type ComponentProps } from 'react';
import { type AiModelTier } from 'twenty-shared/ai';

import { AiModelTierIndicator } from '@/ai/components/AiModelTierIndicator';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  button: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'none',
    cursor: 'pointer',
    display: 'flex',
    height: '24px',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-1'],
  },
  buttonDisabled: {
    backgroundColor: 'transparent',
    cursor: 'default',
    opacity: 0.5,
  },
});

type AiModelTierBarsProps = ComponentProps<'button'> & {
  selectedTier: AiModelTier;
  label: string;
};

export const AiModelTierBars = ({
  selectedTier,
  label,
  disabled = false,
  ref,
  ...props
}: AiModelTierBarsProps) =>
  useRender({
    defaultTagName: 'button',
    render: (
      <button
        {...stylex.props(styles.button, disabled && styles.buttonDisabled)}
        disabled={disabled}
      />
    ),
    ref,
    props: {
      ...props,
      type: 'button',
      'aria-label': label,
      disabled,
      children: <AiModelTierIndicator tier={selectedTier} />,
    },
  });
