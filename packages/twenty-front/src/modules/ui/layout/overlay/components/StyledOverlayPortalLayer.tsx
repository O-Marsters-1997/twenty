import { zIndex } from '@/ui/layout/constants/layout.stylex';
import * as stylex from '@stylexjs/stylex';
import { type ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    display: 'flex',
    zIndex: zIndex.dropdownPortalBelowModal,
  },
  aboveModal: {
    zIndex: zIndex.dropdownPortalAboveModal,
  },
});

type StyledOverlayPortalLayerProps = ComponentProps<'div'> & {
  isAboveModal?: boolean;
};

export const StyledOverlayPortalLayer = ({
  isAboveModal,
  ...props
}: StyledOverlayPortalLayerProps) => (
  <div
    {...props}
    {...stylex.props(styles.root, isAboveModal === true && styles.aboveModal)}
  />
);
