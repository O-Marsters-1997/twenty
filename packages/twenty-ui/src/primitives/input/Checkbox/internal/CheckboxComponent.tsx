import * as stylex from '@stylexjs/stylex';

import { IconCheck, IconMinus } from '@ui/icon';

import { fontColor } from '../../../../theme/tokens.stylex';
import { checkboxIndicatorMarker } from '../Checkbox.stylex';
import { type CheckboxProps } from '../types/CheckboxProps';
import { CheckboxIndicator } from './CheckboxIndicator';
import { CheckboxRoot } from './CheckboxRoot';

const indeterminate = stylex.when.ancestor(
  ':is([data-indeterminate])',
  checkboxIndicatorMarker,
);

export const CheckboxComponent = ({ children, ...props }: CheckboxProps) => (
  <CheckboxRoot {...props}>
    <CheckboxIndicator>
      <IconCheck {...stylex.props(styles.icon, styles.check)} aria-hidden />
      <IconMinus {...stylex.props(styles.icon, styles.minus)} aria-hidden />
    </CheckboxIndicator>
    {children}
  </CheckboxRoot>
);

const styles = stylex.create({
  icon: {
    blockSize: '100%',
    inlineSize: '100%',
    stroke: fontColor['--t-font-color-inverted'],
  },
  check: { display: { default: 'block', [indeterminate]: 'none' } },
  minus: { display: { default: 'none', [indeterminate]: 'block' } },
});
