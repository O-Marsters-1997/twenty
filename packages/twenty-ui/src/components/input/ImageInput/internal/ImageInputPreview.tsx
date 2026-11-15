import { isNonEmptyString } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';

import { IconPhotoUp } from '@ui/icon';
import { useTheme } from '@ui/theme';

import { media } from '../../../../theme/constants.stylex';
import { fontColor } from '../../../../theme/tokens.stylex';
import { imageInputPreviewMarker } from '../ImageInput.stylex';

type ImageInputPreviewProps = {
  src?: string | null;
};

export const ImageInputPreview = ({ src }: ImageInputPreviewProps) => {
  const theme = useTheme();
  const [hasError, setHasError] = useState(false);

  if (!isNonEmptyString(src) || hasError) {
    return (
      <IconPhotoUp
        {...stylex.props(styles.placeholder)}
        size={theme.icon.size.lg}
        aria-hidden
      />
    );
  }

  return (
    <img
      {...stylex.props(styles.image)}
      src={src}
      alt=""
      onError={() => setHasError(true)}
    />
  );
};

const styles = stylex.create({
  image: { blockSize: '100%', inlineSize: '100%', objectFit: 'cover' },
  placeholder: {
    color: {
      default: null,
      [media.hoverCapable]: {
        default: null,
        [stylex.when.ancestor(
          ':hover:not(:is(:disabled, [aria-disabled="true"]))',
          imageInputPreviewMarker,
        )]: fontColor['--t-font-color-tertiary'],
      },
    },
  },
});
