import * as stylex from '@stylexjs/stylex';

export const SettingsDataModelRelationPreviewImage = ({
  isMobile,
  flip,
  src,
  alt,
}: {
  isMobile: boolean;
  flip?: boolean;
  src: string;
  alt: string;
}) => {
  return (
    <img
      {...stylex.props(
        styles.image,
        isMobile && !flip && styles.rotated,
        !isMobile && flip === true && styles.flipped,
        isMobile && flip === true && styles.rotatedFlipped,
      )}
      src={src}
      alt={alt}
    />
  );
};

const styles = stylex.create({
  image: {
    marginBottom: 'auto',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: 'auto',
    width: 54,
  },
  rotated: {
    transform: 'rotate(90deg)',
  },
  flipped: {
    transform: 'scaleX(-1)',
  },
  rotatedFlipped: {
    transform: 'rotate(90deg) scaleX(-1)',
  },
});
