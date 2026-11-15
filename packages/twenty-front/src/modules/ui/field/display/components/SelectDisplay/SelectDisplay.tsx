import * as stylex from '@stylexjs/stylex';
import { type IconComponent } from 'twenty-ui/icon';
import { Tag } from 'twenty-ui/primitives/data-display';
import { type ThemeColor } from 'twenty-ui/theme';
import { isDefined } from 'twenty-shared/utils';

type SelectDisplayProps = {
  color: ThemeColor | 'transparent';
  label: string;
  Icon?: IconComponent;
};

const styles = stylex.create({
  tag: {
    minWidth: 'fit-content',
  },
});

export const SelectDisplay = ({ color, label, Icon }: SelectDisplayProps) => (
  <Tag
    truncate={false}
    color={color}
    startIcon={isDefined(Icon) ? <Icon /> : undefined}
    {...stylex.props(styles.tag)}
  >
    {label}
  </Tag>
);
