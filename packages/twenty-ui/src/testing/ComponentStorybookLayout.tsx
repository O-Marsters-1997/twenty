import * as stylex from '@stylexjs/stylex';
import { type JSX } from 'react';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { background, borderColor } from '../theme/tokens.stylex';

type ComponentStorybookLayoutProps = {
  width?: number;
  backgroundColor?: string | undefined;
  height?: number;
  children: JSX.Element;
};

export const ComponentStorybookLayout = ({
  width,
  backgroundColor,
  height,
  children,
}: ComponentStorybookLayoutProps) => {
  return (
    <div
      {...stylex.props(styles.layout)}
      style={{
        background: backgroundColor,
        height: isDefined(height) ? `${height}px` : 'fit-content',
        minWidth: width ? 'unset' : '300px',
        width: width ? `${width}px` : 'fit-content',
      }}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  layout: {
    backgroundColor: background['--t-background-primary'],
    borderColor: borderColor['--t-border-color-light'],
    borderRadius: 5,
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'row',
    maxWidth: 'calc(100% - 40px)',
    padding: 20,
  },
});
