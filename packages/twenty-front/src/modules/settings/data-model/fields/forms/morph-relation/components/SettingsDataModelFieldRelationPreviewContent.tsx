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
    gap: 6,
    display: 'flex',
    flexDirection: 'row',
  },
  contentMobile: {
    flexDirection: 'column',
  },
});
