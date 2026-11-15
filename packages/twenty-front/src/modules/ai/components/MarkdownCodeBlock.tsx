import { useLingui } from '@lingui/react/macro';
import { isNumber, isString } from '@sniptt/guards';
import { Children, isValidElement } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconCopy } from 'twenty-ui/icon';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { animationDuration, background, borderRadius, spacing } from 'twenty-ui/theme/tokens.stylex';

const extractTextFromNode = (node: React.ReactNode): string => {
  if (isString(node) || isNumber(node)) {
    return node.toString();
  }

  if (Array.isArray(node)) {
    return node.map(extractTextFromNode).join('');
  }

  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return Children.toArray(node.props.children)
      .map(extractTextFromNode)
      .join('');
  }

  return '';
};

const containerMarker = stylex.defineMarker();

const styles = stylex.create({
  copyButton: {
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': background['--t-background-primary'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    display: 'flex',
    insetInlineEnd: spacing['--t-spacing-2'],
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', containerMarker)]: 1,
    },
    position: 'absolute',
    top: spacing['--t-spacing-2'],
    transitionDuration: `calc(${animationDuration['--t-animation-duration-fast']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease',
  },
  root: {
    position: 'relative',
  },
});

export const MarkdownCodeBlock = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { t } = useLingui();
  const { copyToClipboard } = useCopyToClipboard();

  const codeText = extractTextFromNode(children);

  return (
    <div
      className="markdown-code-outer-container"
      {...stylex.props(styles.root, containerMarker)}
    >
      <div {...stylex.props(styles.copyButton)}>
        <LightIconButton
          onClick={() => copyToClipboard(codeText, t`Code copied to clipboard`)}
          title={t`Copy code`}
          size="sm"
          emphasis="subtle"
          aria-label={t`Copy code`}
        >
          <IconCopy />
        </LightIconButton>
      </div>
      <pre className="markdown-block-code">{children}</pre>
    </div>
  );
};
