import { Button } from '@ui/primitives/input/Button/Button';

import { type CalloutActionProps } from '../types/CalloutActionProps';

export const CalloutAction = (props: CalloutActionProps) => {
  return <Button {...props} size="sm" variant="ghost" />;
};
