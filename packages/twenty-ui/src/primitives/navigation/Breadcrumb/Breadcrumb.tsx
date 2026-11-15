import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import {
  font,
  fontColor,
  fontSize,
  spacing,
} from '../../../theme/tokens.stylex';
import { BreadcrumbItemContent } from './internal/BreadcrumbItemContent';
import { type BreadcrumbProps } from './types/BreadcrumbProps';

export const Breadcrumb = ({
  links,
  className,
  xstyle,
  render,
  ref,
  'aria-label': ariaLabel = 'Breadcrumb',
  ...props
}: WithXstyle<BreadcrumbProps>) => {
  return useRender({
    defaultTagName: 'nav',
    render,
    ref,
    props: {
      ...props,
      'aria-label': ariaLabel,
      ...mergeStylexProps(stylex.props(styles.root, xstyle), className),
      children: (
        <ol {...stylex.props(styles.list)}>
          {links.map((link, index) => (
            <li {...stylex.props(styles.item)} key={index}>
              {index > 0 && (
                <span {...stylex.props(styles.separator)} aria-hidden="true">
                  /
                </span>
              )}
              <BreadcrumbItemContent
                {...link}
                current={index === links.length - 1}
              />
            </li>
          ))}
        </ol>
      ),
    },
  });
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    blockSize: spacing['--t-spacing-8'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    maxInlineSize: '100%',
    minInlineSize: 0,
    overflow: 'hidden',
  },
  list: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    listStyle: 'none',
    marginBlock: 0,
    marginInline: 0,
    maxInlineSize: '100%',
    minInlineSize: 0,
    paddingBlock: 0,
    paddingInline: 0,
  },
  item: {
    alignItems: 'center',
    display: 'flex',
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: {
      default: 0,
      ':last-child': 1,
    },
    gap: spacing['--t-spacing-1'],
    minInlineSize: 0,
  },
  separator: {
    flexBasis: spacing['--t-spacing-2'],
    flexGrow: 0,
    flexShrink: 0,
  },
});
