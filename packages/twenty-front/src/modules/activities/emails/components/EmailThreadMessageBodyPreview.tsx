import React from 'react';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  threadMessageBodyPreview: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type EmailThreadMessageBodyPreviewProps = {
  body: string;
};

export const EmailThreadMessageBodyPreview = ({
  body,
}: EmailThreadMessageBodyPreviewProps) => {
  return <div {...stylex.props(styles.threadMessageBodyPreview)}>{body}</div>;
};
