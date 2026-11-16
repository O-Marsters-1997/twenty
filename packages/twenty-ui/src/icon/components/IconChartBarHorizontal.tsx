import * as stylex from '@stylexjs/stylex';

import { IconChartBar } from '@ui/icon/components/TablerIcons';
import { type IconComponentProps } from '@ui/icon/types/IconComponent';
import { useTheme } from '@ui/theme';
import { type WithXstyle } from '@ui/utilities/types/WithXstyle';

type IconChartBarHorizontalProps = WithXstyle<
  Pick<IconComponentProps, 'size' | 'stroke' | 'color'>
>;

export const IconChartBarHorizontal = (props: IconChartBarHorizontalProps) => {
  const theme = useTheme();
  const size = props.size ?? theme.icon.size.md;
  const stroke = props.stroke ?? theme.icon.stroke.sm;

  return (
    <div {...stylex.props(styles.rotatedIconWrapper, props.xstyle)}>
      <IconChartBar size={size} stroke={stroke} color={props.color} />
    </div>
  );
};

const styles = stylex.create({
  rotatedIconWrapper: {
    display: 'inline-flex',
    transform: 'rotate(90deg)',
  },
});
