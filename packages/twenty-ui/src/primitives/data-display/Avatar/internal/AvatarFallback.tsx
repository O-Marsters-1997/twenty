import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import '../Avatar.css';
import { avatarStyles } from '../Avatar.stylex';
import { type AvatarFallbackProps } from '../types/AvatarFallbackProps';

export const AvatarFallback = ({
  className,
  xstyle,
  ...props
}: WithXstyle<AvatarFallbackProps>) => (
  <AvatarPrimitive.Fallback
    {...props}
    {...mergeStylexProps(
      mergeStylexProps(
        stylex.props(avatarStyles.fallback, xstyle),
        'tw-avatar-fallback',
      ),
      className,
    )}
  />
);
