import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { focusStyles } from '../../../../styles/focus.stylex';
import { cardStyles } from '../Card.stylex';
import { type CardHeaderProps } from '../types/CardHeaderProps';

export const CardHeader = ({
  className,
  render,
  ref,
  xstyle,
  ...props
}: WithXstyle<CardHeaderProps>) =>
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
          cardStyles.header,
          xstyle,
        ),
        className,
      ),
    },
  });
