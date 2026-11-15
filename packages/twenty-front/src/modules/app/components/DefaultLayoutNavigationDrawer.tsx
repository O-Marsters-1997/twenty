import { AppNavigationDrawer } from '@/navigation/components/AppNavigationDrawer';
import { useShowFullscreen } from '@/ui/layout/fullscreen/hooks/useShowFullscreen';
import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  wrapper: {
    display: {
      default: null,
      [media.print]: 'none',
    },
    flexShrink: 0,
  },
});

export const DefaultLayoutNavigationDrawer = () => {
  const showFullscreen = useShowFullscreen();

  if (showFullscreen) {
    return null;
  }

  return (
    <div {...stylex.props(styles.wrapper)}>
      <AppNavigationDrawer />
    </div>
  );
};
