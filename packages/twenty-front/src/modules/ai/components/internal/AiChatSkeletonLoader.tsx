import { SkeletonLine } from '@/ui/feedback/skeleton/components/SkeletonLine';
import { aiChatContentContainerStyles } from '@/ai/components/StyledAiChatContentContainer';

import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  skeletonContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    padding: spacing['--t-spacing-3'],
  },
});

export const AiChatSkeletonLoader = () => {
  return (
    <div
      {...stylex.props(
        aiChatContentContainerStyles.root,
        styles.skeletonContainer,
      )}
    >
      <SkeletonLine height={20} borderRadius={8} />
    </div>
  );
};
