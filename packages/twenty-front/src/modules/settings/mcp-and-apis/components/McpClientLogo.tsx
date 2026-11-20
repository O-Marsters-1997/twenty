import * as stylex from '@stylexjs/stylex';
import { useThemeColorScheme } from 'twenty-ui/theme';

const styles = stylex.create({
  image: {
    display: 'block',
    filter: 'none',
    objectFit: 'contain',
    height: '100%',
    width: '100%',
  },
  imageInverted: {
    filter: 'invert(1)',
  },
});

type McpClientLogoProps = {
  invertInDarkMode?: boolean;
  src: string;
};

export const McpClientLogo = ({
  invertInDarkMode = false,
  src,
}: McpClientLogoProps) => {
  const colorScheme = useThemeColorScheme();

  return (
    <img
      src={src}
      alt=""
      {...stylex.props(
        styles.image,
        invertInDarkMode && colorScheme === 'dark' && styles.imageInverted,
      )}
    />
  );
};
