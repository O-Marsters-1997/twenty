import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';
import { Field } from 'twenty-ui/primitives/input';

type FormFieldInputContainerProps = Omit<
  ComponentProps<typeof Field.Root>,
  'className'
>;

export const FormFieldInputContainer = (
  props: FormFieldInputContainerProps,
) => <Field.Root {...props} className={stylex.props(styles.root).className} />;

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
});
