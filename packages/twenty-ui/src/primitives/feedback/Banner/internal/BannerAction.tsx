import { Button } from '@ui/primitives/input/Button/Button';

import { bannerActionStyles } from '../Banner.stylex';
import { type BannerActionProps } from '../types/BannerActionProps';

export const BannerAction = ({ xstyle, ...props }: BannerActionProps) => {
  return (
    <Button
      {...props}
      size="sm"
      variant="outline"
      xstyle={[bannerActionStyles.action, xstyle]}
    />
  );
};
