import { type ReactNode } from 'react';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { fontWeight, spacing, tooltip } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  title: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    minInlineSize: 0,
  },
  titleText: {
    minInlineSize: 0,
    overflowWrap: 'anywhere',
  },
  icon: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: spacing['--t-spacing-4'],
  },
  description: {
    color: tooltip['--t-tooltip-description-color'],
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
});

type TooltipTextContentProps = {
  children?: ReactNode;
  description?: ReactNode;
  startIcon?: ReactNode;
};

export const TooltipTextContent = ({
  children,
  description,
  startIcon,
}: TooltipTextContentProps) => (
  <div {...stylex.props(styles.content)}>
    {isDefined(children) && children !== '' && (
      <div {...stylex.props(styles.title)}>
        {isDefined(startIcon) && (
          <span aria-hidden {...stylex.props(styles.icon)}>
            {startIcon}
          </span>
        )}
        <span {...stylex.props(styles.titleText)}>{children}</span>
      </div>
    )}
    {isDefined(description) && (
      <div {...stylex.props(styles.description)}>{description}</div>
    )}
  </div>
);
