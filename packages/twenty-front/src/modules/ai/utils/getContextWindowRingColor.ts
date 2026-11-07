import { themeCssVariables } from 'twenty-ui/theme';

export const getContextWindowRingColor = (
  consumedPercentage: number,
): string => {
  if (consumedPercentage > 80) {
    return themeCssVariables.color.red;
  }

  if (consumedPercentage > 60) {
    return themeCssVariables.color.orange;
  }

  return themeCssVariables.color.blue;
};
