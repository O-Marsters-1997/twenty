import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { fontColor } from '../../../../theme/tokens.stylex';
import { type SectionRootProps } from '../types/SectionRootProps';

export const SectionRoot = ({
  align = 'left',
  color = 'primary',
  fullWidth = true,
  className,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<SectionRootProps>) =>
  useRender({
    render,
    ref,
    props: {
      ...props,
      'data-align': align,
      'data-color': color,
      ...mergeStylexProps(
        stylex.props(
          styles.root,
          alignStyles[align],
          colorStyles[color],
          fullWidth && styles.fullWidth,
          xstyle,
        ),
        className,
      ),
    },
  });

const alignStyles = stylex.create({
  left: { textAlign: 'left' },
  center: { textAlign: 'center' },
});

const colorStyles = stylex.create({
  primary: { color: fontColor['--t-font-color-primary'] },
  secondary: { color: fontColor['--t-font-color-secondary'] },
  tertiary: { color: fontColor['--t-font-color-tertiary'] },
});

const styles = stylex.create({
  root: {
    inlineSize: 'auto',
  },
  fullWidth: {
    inlineSize: '100%',
  },
});
