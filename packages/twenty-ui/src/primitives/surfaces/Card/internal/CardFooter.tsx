import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { cardStyles } from '../Card.stylex';
import { type CardFooterProps } from '../types/CardFooterProps';

export const CardFooter = ({
  className,
  divider,
  render,
  ref,
  xstyle,
  ...props
}: WithXstyle<CardFooterProps>) =>
  useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(
        stylex.props(
          focusStyles.ring,
          cardStyles.owner,
          cardStyles.section,
          cardStyles.footer,
          divider === false && cardStyles.footerNoDivider,
          xstyle,
        ),
        className,
      ),
      'data-no-divider': divider === false || undefined,
    },
  });
