import { IconDotsVertical } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderColor, borderRadius, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  loadingIconContainer: {
    alignItems: 'center',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    display: 'flex',
    justifyContent: 'center',
    paddingInline: spacing['--t-spacing-1'],
    width: 'fit-content',
  },
  loadingIconWrapper: {
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    transform: 'rotate(90deg)',
  },
});

export const AiChatInitialLoadingIndicator = () => {
  const theme = useTheme();

  return (
    <div {...stylex.props(styles.loadingIconContainer)}>
      <span {...stylex.props(styles.loadingIconWrapper)}>
        <IconDotsVertical size={theme.icon.size.xl} />
      </span>
    </div>
  );
};
