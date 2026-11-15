import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import { media } from '../../../theme/constants.stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  boxShadow,
  spacing,
} from '../../../theme/tokens.stylex';
import { buttonVars } from '../Button/Button.stylex';
import { ButtonGroupContext } from './internal/ButtonGroupContext';
import { type ButtonGroupProps } from './types/ButtonGroupProps';

export const ButtonGroup = ({
  attached = true,
  framed = false,
  className,
  xstyle,
  children,
  variant,
  size,
  color,
  render,
  ref,
  ...props
}: ButtonGroupProps) => {
  const element = useRender({
    render,
    ref,
    props: {
      role: 'group',
      ...props,
      ...mergeStylexProps(
        stylex.props(
          styles.container,
          framed && framedTheme,
          framed && styles.framed,
          !attached && styles.detached,
          xstyle,
        ),
        className,
      ),
      children,
    },
  });

  return (
    <ButtonGroupContext.Provider value={{ variant, color, size, attached }}>
      {element}
    </ButtonGroupContext.Provider>
  );
};

const framedTheme = stylex.createTheme(buttonVars, {
  '--tw-button-radius': `calc(${borderRadius['--t-border-radius-sm']} - ${spacing['--t-spacing-0_5']} - 1px)`,
});

const styles = stylex.create({
  container: {
    borderRadius: borderRadius['--t-border-radius-md'],
    display: 'inline-flex',
    maxInlineSize: '100%',
  },
  framed: {
    alignItems: 'flex-start',
    backdropFilter: 'blur(20px)',
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-strong'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    boxShadow: {
      default: null,
      ':hover': { default: null, [media.hoverCapable]: boxShadow['--t-box-shadow-light'] },
    },
    padding: spacing['--t-spacing-0_5'],
  },
  detached: { gap: spacing['--t-spacing-0_5'] },
});
