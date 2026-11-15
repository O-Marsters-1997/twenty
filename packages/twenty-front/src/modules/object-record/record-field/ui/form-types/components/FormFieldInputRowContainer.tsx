import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

export const LINE_HEIGHT = 24;

type FormFieldInputRowContainerProps = ComponentProps<'div'> & {
  multiline?: boolean;
  maxHeight?: number;
  xstyle?: stylex.StyleXStyles;
};

export const FormFieldInputRowContainer = ({
  multiline,
  maxHeight,
  xstyle,
  ...divProps
}: FormFieldInputRowContainerProps) => (
  <div
    // oxlint-disable-next-line react/jsx-props-no-spreading
    {...divProps}
    {...stylex.props(
      styles.container,
      multiline
        ? [
            styles.multiline,
            styles.multilineMaxHeight(maxHeight ?? 5 * LINE_HEIGHT),
          ]
        : styles.singleLine,
      xstyle,
    )}
  />
);

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    position: 'relative',
  },
  singleLine: {
    height: 32,
    lineHeight: 'normal',
    maxHeight: 'none',
    minHeight: 'auto',
  },
  multiline: {
    height: 'auto',
    lineHeight: `${LINE_HEIGHT}px`,
    minHeight: 3 * LINE_HEIGHT,
  },
  multilineMaxHeight: (maxHeight: number) => ({ maxHeight }),
});
