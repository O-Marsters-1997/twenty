import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';
import { isDefined } from '@ui/utilities/utils/isDefined';

import {
  background,
  borderColor,
  borderRadius,
  codeFont,
  codeText,
  fontColor,
  spacing,
} from '../../../theme/tokens.stylex';
import { type CommandBlockProps } from './types/CommandBlockProps';

export const CommandBlock = ({
  commands,
  actions,
  render,
  ref,
  className,
  xstyle,
  ...props
}: WithXstyle<CommandBlockProps>) =>
  useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.container, xstyle), className),
      children: (
        <>
          <pre {...stylex.props(styles.commands)}>
            <code {...stylex.props(styles.code)}>
              {commands.map((line, index) => (
                <span key={index}>
                  {index > 0 && '\n'}
                  <span {...stylex.props(styles.prompt)} aria-hidden="true">
                    {'> '}
                  </span>
                  {line}
                </span>
              ))}
            </code>
          </pre>
          {isDefined(actions) && (
            <div {...stylex.props(styles.actions)}>{actions}</div>
          )}
        </>
      ),
    },
  });

const styles = stylex.create({
  container: {
    alignItems: 'center',
    backgroundColor: background['--t-background-secondary'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    justifyContent: 'space-between',
    minInlineSize: 0,
    padding: spacing['--t-spacing-3'],
  },
  commands: {
    color: fontColor['--t-font-color-primary'],
    fontFamily: codeFont['--t-code-font-family'],
    margin: 0,
    minInlineSize: 0,
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
  code: {
    font: 'inherit',
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: spacing['--t-spacing-2'],
  },
  prompt: {
    color: codeText['--t-code-text-orange'],
  },
});
