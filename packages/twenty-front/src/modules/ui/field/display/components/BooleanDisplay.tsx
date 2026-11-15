import { t } from '@lingui/core/macro';
import { IconCheck, IconX } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
const iconSizeSm = 14;

const styles = stylex.create({
  booleanFieldValue: {
    marginLeft: '4px',
  },
  container: {
    alignItems: 'center',
    display: 'flex',
    height: '20px',
  },
});

type BooleanDisplayProps = {
  value: boolean | null | undefined;
};

export const BooleanDisplay = ({ value }: BooleanDisplayProps) => {
  if (value === null || value === undefined) {
    return <div {...stylex.props(styles.container)} />;
  }

  const isTrue = value === true;

  return (
    <div {...stylex.props(styles.container)}>
      {isTrue ? <IconCheck size={iconSizeSm} /> : <IconX size={iconSizeSm} />}
      <div {...stylex.props(styles.booleanFieldValue)}>
        {isTrue ? t`True` : t`False`}
      </div>
    </div>
  );
};
