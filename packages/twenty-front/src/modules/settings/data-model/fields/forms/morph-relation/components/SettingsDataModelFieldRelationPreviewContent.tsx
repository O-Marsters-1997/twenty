import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';

export const SettingsDataModelFieldRelationPreviewContent = ({
  isMobile,
  children,
}: {
  isMobile: boolean;
  children: ReactNode;
}) => {
  return (
    <div {...stylex.props(styles.content, isMobile && styles.contentMobile)}>
      {children}
    </div>
  );
};

const styles = stylex.create({
  content: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
  },
  contentMobile: {
    flexDirection: 'column',
  },
});
