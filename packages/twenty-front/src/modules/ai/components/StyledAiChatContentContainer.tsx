import * as stylex from '@stylexjs/stylex';

export const aiChatContentContainerStyles = stylex.create({
  root: {
    boxSizing: 'border-box',
    marginInline: 'auto',
    maxWidth: 'var(--ai-chat-content-max-width, none)',
    width: '100%',
  },
});
