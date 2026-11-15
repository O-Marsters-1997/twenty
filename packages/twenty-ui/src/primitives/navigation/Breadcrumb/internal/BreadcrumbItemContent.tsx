import { useRender } from '@base-ui/react/use-render';
import { isString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import { focusStyles } from '../../../../styles/focus.stylex';
import { fontColor } from '../../../../theme/tokens.stylex';
import { type BreadcrumbItem } from '../types/BreadcrumbItem';

type BreadcrumbItemContentProps = WithXstyle<
  BreadcrumbItem & {
    current: boolean;
  }
>;

export const BreadcrumbItemContent = ({
  children,
  href,
  render,
  title,
  current,
  className,
  xstyle,
  ref,
  'aria-current': ariaCurrent = current ? 'page' : undefined,
  ...props
}: BreadcrumbItemContentProps) => {
  return useRender({
    defaultTagName: isDefined(href) ? 'a' : 'span',
    render,
    ref,
    props: {
      ...props,
      children,
      href,
      title: title ?? (isString(children) ? children : undefined),
      'aria-current': ariaCurrent,
      'data-linked': isDefined(href) || undefined,
      ...mergeStylexProps(
        stylex.props(
          focusStyles.ring,
          styles.content,
          isDefined(href) && styles.linked,
          xstyle,
        ),
        className,
      ),
    },
  });
};

const styles = stylex.create({
  content: {
    color: fontColor['--t-font-color-primary'],
    display: 'block',
    minInlineSize: 0,
    outlineOffset: {
      default: null,
      ':focus-visible': '-2px',
    },
    overflow: 'hidden',
    textDecoration: 'none',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  linked: { color: 'inherit' },
});
