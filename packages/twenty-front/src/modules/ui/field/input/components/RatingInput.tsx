import { t } from '@lingui/core/macro';
import { useState } from 'react';

import { useClearField } from '@/object-record/record-field/ui/hooks/useClearField';
import { RATING_VALUES } from 'twenty-shared/constants';
import { type FieldRatingValue } from 'twenty-shared/types';
import { IconTwentyStarFilled } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background, fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
  },
  iconContainer: {
    display: 'inline-flex',
  },
  iconActive: {
    color: fontColor['--t-font-color-secondary'],
  },
  iconInactive: {
    color: background['--t-background-quaternary'],
  },
});

type RatingInputProps = {
  onChange?: (newValue: FieldRatingValue) => void;
  value: FieldRatingValue;
  readonly?: boolean;
};

export const RatingInput = ({
  onChange,
  value,
  readonly,
}: RatingInputProps) => {
  const clearField = useClearField();
  const theme = useTheme();

  const iconSizeMd = theme.icon.size.md;

  const [hoveredValue, setHoveredValue] = useState<FieldRatingValue>(null);

  const currentValue = hoveredValue ?? value;

  const selectedIndex =
    currentValue !== null ? RATING_VALUES.indexOf(currentValue) : -1;

  const canClick = !readonly;

  const handleClick = (newValue: FieldRatingValue) => {
    if (!canClick) return;
    if (newValue === value) {
      setHoveredValue(null);
      clearField();
    } else {
      onChange?.(newValue);
    }
  };

  return (
    <div
      role="slider"
      aria-label={t`Rating`}
      aria-valuemax={RATING_VALUES.length}
      aria-valuemin={1}
      aria-valuenow={selectedIndex + 1}
      tabIndex={0} {...stylex.props(styles.container)}
    >
      {RATING_VALUES.map((value, index) => {
        const isActive = index <= selectedIndex;

        return (
          <div
            key={index}
            onClick={() => handleClick(value)}
            onMouseEnter={readonly ? undefined : () => setHoveredValue(value)}
            onMouseLeave={readonly ? undefined : () => setHoveredValue(null)}
            {...stylex.props(
              styles.iconContainer,
              isActive ? styles.iconActive : styles.iconInactive,
            )}
          >
            <IconTwentyStarFilled size={iconSizeMd} />
          </div>
        );
      })}
    </div>
  );
};
