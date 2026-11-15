import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { cardStyles } from '../Card.stylex';
import { type CardContentProps } from '../types/CardContentProps';

export const CardContent = ({
  className,
  divider,
  render,
  ref,
  xstyle,
  ...props
}: WithXstyle<CardContentProps>) =>
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
          cardStyles.content,
          divider && cardStyles.contentDivider,
          xstyle,
        ),
        className,
      ),
      'data-divider': divider || undefined,
    },
  });
