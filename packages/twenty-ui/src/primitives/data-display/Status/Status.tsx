import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { type CSSProperties } from 'react';

import { Loader } from '@ui/primitives/feedback/Loader/Loader';
import { themeCssVariables } from '@ui/theme';
import { parseThemeColor } from '@ui/utilities';
import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { statusStyles } from './Status.stylex';
import { type StatusProps } from './types/StatusProps';

export const Status = ({
  children,
  color,
  loading = false,
  weight = 'regular',
  className,
  style,
  xstyle,
  render,
  ref,
  ...props
}: WithXstyle<StatusProps>) => {
  const parsedColor = parseThemeColor(color);
  const stylexProps = stylex.props(
    statusStyles.root,
    weight === 'medium' && statusStyles.weightMedium,
    loading && statusStyles.loading,
    xstyle,
  );

  return useRender({
    defaultTagName: 'span',
    render,
    ref,
    state: { loading, weight },
    props: {
      'aria-busy': loading || undefined,
      ...props,
      ...mergeStylexProps(stylexProps, className),
      style: {
        ...stylexProps.style,
        '--tw-status-background': themeCssVariables.tag.background[parsedColor],
        '--tw-status-text-color': themeCssVariables.tag.text[parsedColor],
        ...style,
      } as CSSProperties,
      children: (
        <>
          <span {...stylex.props(statusStyles.content)}>{children}</span>
          {loading && (
            <Loader color={color} aria-hidden="true" render={<span />} />
          )}
        </>
      ),
    },
  });
};
