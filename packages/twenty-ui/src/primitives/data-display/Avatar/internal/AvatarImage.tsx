import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { avatarStyles } from '../Avatar.stylex';
import { type AvatarImageProps } from '../types/AvatarImageProps';

export const AvatarImage = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AvatarImageProps>) => (
  <AvatarPrimitive.Image
    {...props}
    {...mergeStylexProps(stylex.props(avatarStyles.image, xstyle), className)}
  />
);
