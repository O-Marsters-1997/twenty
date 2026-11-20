import { AI_MODEL_TIERS, type AiModelTier } from 'twenty-shared/ai';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  bar: {
    borderRadius: '4px',
    flex: '1',
    backgroundColor: fontColor['--t-font-color-extra-light'],
    height: '8px',
  },
  barReached: {
    backgroundColor: fontColor['--t-font-color-secondary'],
  },
  indicator: {
    gap: '2px',
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: '0',
    height: '12px',
    width: '24px',
  },
});

type AiModelTierIndicatorProps = {
  tier: AiModelTier;
};

export const AiModelTierIndicator = ({ tier }: AiModelTierIndicatorProps) => {
  const selectedStep = AI_MODEL_TIERS.indexOf(tier);

  return (
    <span aria-hidden="true" {...stylex.props(styles.indicator)}>
      {AI_MODEL_TIERS.map((modelTier, index) => (
        <span
          {...stylex.props(
            styles.bar,
            index <= selectedStep && styles.barReached,
          )}
          key={modelTier}
        />
      ))}
    </span>
  );
};
