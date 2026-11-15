import * as stylex from '@stylexjs/stylex';

import { mergeStylexProps } from '@ui/utilities/internal/mergeStylexProps';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

import { fontColor, fontWeight } from '../../../../theme/tokens.stylex';

export type LabelVariant = 'default' | 'small';

type LabelProps = {
  variant?: LabelVariant;
  children?: React.ReactNode;
  className?: string;
};

export const Label = ({
  variant = 'default',
  children,
  className,
  xstyle,
}: WithXstyle<LabelProps>) => {
  return (
    <div
      {...mergeStylexProps(
        stylex.props(styles.label, styles[variant], xstyle),
        className,
      )}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  label: {
    color: fontColor['--t-font-color-light'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  default: { fontSize: 11 },
  small: { fontSize: 9 },
});
