import { type IconComponentProps } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';

const styles = stylex.create({
  logo: { objectFit: 'contain' },
  inverted: { filter: 'invert(1)' },
});

type ModelsDevProviderLogoProps = {
  logoUrl: string;
} & Pick<IconComponentProps, 'className' | 'size' | 'style'>;

const resolvePixelSize = (
  size: IconComponentProps['size'] | undefined,
): number => {
  if (typeof size === 'number') {
    return size;
  }
  if (typeof size === 'string') {
    const parsed = parseInt(size, 10);

    return Number.isNaN(parsed) ? 16 : parsed;
  }

  return 16;
};

export const ModelsDevProviderLogo = ({
  logoUrl,
  size,
  className,
  style,
}: ModelsDevProviderLogoProps) => {
  const theme = useTheme();
  const pixelSize = resolvePixelSize(size);
  const isLightTheme = theme.name === 'light';
  const stylexProps = stylex.props(
    styles.logo,
    !isLightTheme && styles.inverted,
  );

  return (
    <img
      alt=""
      className={[stylexProps.className, className].filter(isDefined).join(' ')}
      height={pixelSize}
      src={logoUrl}
      style={{ ...stylexProps.style, ...style }}
      width={pixelSize}
    />
  );
};
