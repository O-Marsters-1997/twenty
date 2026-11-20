import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  label: {
    color: fontColor['--t-font-color-tertiary'],
    flexShrink: 0,
    fontSize: fontSize['--t-font-size-md'],
    whiteSpace: 'nowrap',
  },
});

export const StyledHeaderIdentifierLabel = ({
  className,
  ...props
}: StyledHeaderIdentifierLabelProps<'span'>) => {
  const labelProps = stylex.props(styles.label);

  return (
    <span
      {...props}
      {...labelProps}
      className={[labelProps.className, className].join(' ')}
    />
  );
};
