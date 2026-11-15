import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  color,
  fontColor,
  spacing,
} from '../../../theme/tokens.stylex';
import { InputGroupContext } from './internal/InputGroupContext';
import { isRenderableAdornment } from './internal/isRenderableAdornment';
import { type InputGroupProps } from './types/InputGroupProps';

export const InputGroup = ({
  size = 'md',
  startElement,
  endElement,
  className,
  xstyle,
  children,
  render,
  ref,
  ...props
}: WithXstyle<InputGroupProps>) => {
  const element = useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(
        stylex.props(
          styles.root,
          size === 'sm' ? styles.sizeSm : styles.sizeMd,
          xstyle,
        ),
        className,
      ),
      children: (
        <>
          {isRenderableAdornment(startElement) && (
            <span {...stylex.props(styles.adornment)}>{startElement}</span>
          )}
          {children}
          {isRenderableAdornment(endElement) && (
            <span {...stylex.props(styles.adornment)}>{endElement}</span>
          )}
        </>
      ),
    },
  });

  return (
    <InputGroupContext.Provider value={{ size }}>
      {element}
    </InputGroupContext.Provider>
  );
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus-within': color['--t-color-blue'],
      ':has([aria-invalid="true"], [data-invalid])':
        borderColor['--t-border-color-danger'],
    },
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    color: {
      default: fontColor['--t-font-color-tertiary'],
      ':focus-within': fontColor['--t-font-color-secondary'],
      ':has(:disabled)': fontColor['--t-font-color-light'],
    },
    cursor: { default: null, ':has(:disabled)': 'not-allowed' },
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    inlineSize: '100%',
    paddingInline: spacing['--t-spacing-2'],
  },
  sizeSm: { blockSize: 24 },
  sizeMd: { blockSize: 32 },
  adornment: { alignItems: 'center', display: 'inline-flex', flex: 'none' },
});
