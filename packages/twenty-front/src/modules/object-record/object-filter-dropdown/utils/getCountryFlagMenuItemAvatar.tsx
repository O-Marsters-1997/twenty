import { type Country } from '@/ui/input/components/internal/types/Country';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  flagPlaceholder: {
    width: '20px',
  },
});

export const getCountryFlagMenuItemAvatar = (
  countryName: string,
  countries: Country[],
): React.ReactNode => {
  const country = countries.find(
    (country) => country.countryName === countryName,
  );

  if (!country) {
    return <div {...stylex.props(styles.flagPlaceholder)} />;
  }

  return country.Flag({ width: 20 });
};
