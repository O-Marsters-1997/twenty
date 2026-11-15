import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';

import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontWeight,
  spacing,
} from '../../../theme/tokens.stylex';
import { type CodeEditorHeaderProps } from './types/CodeEditorHeaderProps';

export const CodeEditorHeader = ({
  title,
  startElement,
  endElement,
  className,
  xstyle,
  render,
  ref,
  ...props
}: CodeEditorHeaderProps) => {
  return useRender({
    render,
    ref,
    props: {
      ...props,
      ...mergeStylexProps(stylex.props(styles.root, xstyle), className),
      children: (
        <>
          <div {...stylex.props(styles.elementContainer)}>
            {startElement}
            {title}
          </div>
          <div {...stylex.props(styles.elementContainer)}>{endElement}</div>
        </>
      ),
    },
  });
};

const styles = stylex.create({
  root: {
    alignItems: 'center',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    blockSize: spacing['--t-spacing-10'],
    borderColor: borderColor['--t-border-color-medium'],
    borderStartEndRadius: borderRadius['--t-border-radius-md'],
    borderStartStartRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: 1,
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    justifyContent: 'space-between',
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
  },
  elementContainer: {
    alignContent: 'flex-end',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
});
