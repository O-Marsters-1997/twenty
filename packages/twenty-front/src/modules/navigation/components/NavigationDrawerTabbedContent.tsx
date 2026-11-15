import * as stylex from '@stylexjs/stylex';
import { NavigationDrawerAiChatContent } from '@/ai/components/NavigationDrawerAiChatContent';
import { type ReactNode } from 'react';

type NavigationDrawerTabbedContentProps = {
  showAiChatContent: boolean;
  shouldMountAiChatContent: boolean;
  navigationContent: ReactNode;
};

const styles = stylex.create({
  tabContent: { display: 'contents' },
  tabContentHidden: { display: 'none' },
});

export const NavigationDrawerTabbedContent = ({
  showAiChatContent,
  shouldMountAiChatContent,
  navigationContent,
}: NavigationDrawerTabbedContentProps) => {
  return (
    <>
      <div
        {...stylex.props(
          styles.tabContent,
          showAiChatContent && styles.tabContentHidden,
        )}
      >
        {navigationContent}
      </div>
      {shouldMountAiChatContent && (
        <div
          {...stylex.props(
            styles.tabContent,
            !showAiChatContent && styles.tabContentHidden,
          )}
        >
          <NavigationDrawerAiChatContent />
        </div>
      )}
    </>
  );
};
