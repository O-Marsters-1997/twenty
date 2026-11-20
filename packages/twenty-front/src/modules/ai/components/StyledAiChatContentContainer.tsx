import * as stylex from '@stylexjs/stylex';

export const aiChatContentContainerStyles = stylex.create({
  root: {
    marginInline: 'auto',
    boxSizing: 'border-box',
    maxWidth: 'var(--ai-chat-content-max-width, none)',
    width: '100%',
  },
});
