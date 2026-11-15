import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { Field } from 'twenty-ui/primitives/input';

export const FormFieldInputContainer = (
  props: Omit<ComponentProps<typeof Field.Root>, 'className'>,
) => <Field.Root {...props} className={stylex.props(styles.root).className} />;

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});
