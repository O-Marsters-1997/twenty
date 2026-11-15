import * as stylex from '@stylexjs/stylex';
import { forwardRef } from 'react';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  background,
  borderColor,
  borderRadius,
} from '../../theme/tokens.stylex';

// The deprecated Linaria styled.div forwarded refs and accepted all native
// div props, so the port preserves that contract.
export const IllustrationIconWrapper = forwardRef<
  HTMLDivElement,
  WithXstyle<React.ComponentPropsWithoutRef<'div'>>
>(({ className, xstyle, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    {...mergeStylexProps(stylex.props(styles.root, xstyle), className)}
  />
));

IllustrationIconWrapper.displayName = 'IllustrationIconWrapper';

const styles = stylex.create({
  root: {
    backgroundColor: background['--t-background-primary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 0.75,
    display: 'flex',
    justifyContent: 'center',
  },
});
