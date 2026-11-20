import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type StyledFormCardTitleProps = {
  children: ReactNode;
  className?: string;
};

export const StyledFormCardTitle = ({
  children,
  className,
}: StyledFormCardTitleProps) => {
  const stylexProps = stylex.props(styles.title);

  return (
    <h3
      className={[stylexProps.className, className].filter(Boolean).join(' ')}
    >
      {children}
    </h3>
  );
};

const styles = stylex.create({
  title: {
    color: fontColor['--t-font-color-extra-light'],
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    marginBottom: spacing['--t-spacing-4'],
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
  },
});
