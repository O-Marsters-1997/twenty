import { RadioGroup } from 'twenty-ui/primitives/input';
import { SettingsRadioCard } from '@/settings/components/SettingsRadioCard';
import { type IconComponent } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  radioCardContainer: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-4'],
  },
});

type SettingsRadioCardContainerProps = {
  onChange: (value: string) => void;
  value: string;
  options: Array<{
    value: string;
    title: string;
    description?: string;
    Icon?: IconComponent;
  }>;
};

export const SettingsRadioCardContainer = ({
  options,
  value,
  onChange,
}: SettingsRadioCardContainerProps) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      render={<div {...stylex.props(styles.radioCardContainer)} />}
    >
      {options.map((option) => (
        <SettingsRadioCard
          key={option.value}
          value={option.value}
          title={option.title}
          description={option.description}
          Icon={option.Icon}
        />
      ))}
    </RadioGroup>
  );
};
