import { useLingui } from '@lingui/react/macro';
import { type ChangeEvent } from 'react';
import { AI_MODEL_TIERS, type AiModelTier } from 'twenty-shared/ai';
import { isDefined } from 'twenty-shared/utils';

import { AiModelTierInformationButton } from '@/ai/components/AiModelTierInformationButton';
import { useAiModelTiers } from '@/ai/hooks/useAiModelTiers';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  boxShadow,
  color,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const TRACK_HEIGHT_PX = 24;
const TRACK_INSET_PX = 0;
const DOT_CENTER_INSET_PX = 18;
const HANDLE_WIDTH_PX = 12;
const HANDLE_HEIGHT_PX = 28;
const LAST_STEP = AI_MODEL_TIERS.length - 1;

const styles = stylex.create({
  track: {
    backgroundColor: background['--t-background-tertiary'],
    borderRadius: borderRadius['--t-border-radius-md'],
    boxShadow: {
      default: null,
      ':has(input:focus-visible)': `0 0 0 3px ${color['--t-color-blue3']}`,
    },
    cornerShape: 'round',
    cursor: 'pointer',
    height: `${TRACK_HEIGHT_PX}px`,
    position: 'relative',
    width: '100%',
  },
  trackDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  fill: {
    backgroundColor: color['--t-color-blue'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    cornerShape: 'round',
    height: `${TRACK_HEIGHT_PX - 2 * TRACK_INSET_PX}px`,
    left: `${TRACK_INSET_PX}px`,
    position: 'absolute',
    top: `${TRACK_INSET_PX}px`,
    transitionDuration: '180ms',
    transitionProperty: {
      default: 'width',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    width: `calc(${DOT_CENTER_INSET_PX - TRACK_INSET_PX + HANDLE_WIDTH_PX / 2}px + var(--slider-step) * (100% - ${2 * DOT_CENTER_INSET_PX}px) / ${LAST_STEP})`,
  },
  dots: {
    display: 'flex',
    insetBlock: 0,
    insetInline: `${DOT_CENTER_INSET_PX - 2}px`,
    justifyContent: 'space-between',
    pointerEvents: 'none',
    position: 'absolute',
  },
  dot: {
    alignSelf: 'center',
    backgroundColor: borderColor['--t-border-color-strong'],
    borderRadius: borderRadius['--t-border-radius-rounded'],
    cornerShape: 'round',
    height: '4px',
    transitionDuration: '180ms',
    transitionProperty: {
      default: 'background-color',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease-out',
    width: '4px',
  },
  dotReached: {
    // oxlint-disable-next-line twenty/no-hardcoded-colors -- Dots must remain translucent white over the blue track in both themes.
    backgroundColor: 'rgba(255, 255, 255, 0.386)',
  },
  handle: {
    backgroundColor: 'white',
    borderRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-light'],
    cornerShape: 'round',
    height: `${HANDLE_HEIGHT_PX}px`,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: `${HANDLE_WIDTH_PX}px`,
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: spacing['--t-spacing-3'],
    width: '100%',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    height: '20px',
    justifyContent: 'space-between',
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  input: {
    appearance: 'none',
    background: 'transparent',
    cursor: 'inherit',
    height: '100%',
    inset: '0',
    marginTop: '0',
    marginRight: '0',
    marginBottom: '0',
    marginLeft: '0',
    opacity: '0',
    position: 'absolute',
    width: '100%',
  },
});

type AiModelTierSliderProps = {
  selectedTier: AiModelTier;
  onTierChange: (tier: AiModelTier) => void;
  // Shown instead of the tier name, for an agent pinned to a specific model.
  title?: string;
  disabled?: boolean;
};

export const AiModelTierSlider = ({
  selectedTier,
  onTierChange,
  title,
  disabled = false,
}: AiModelTierSliderProps) => {
  const { t } = useLingui();
  const tiers = useAiModelTiers();

  const selectedStep = AI_MODEL_TIERS.indexOf(selectedTier);
  const resolvedTier = tiers[selectedStep];
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const tier = AI_MODEL_TIERS[Number(event.target.value)];

    if (isDefined(tier)) {
      onTierChange(tier);
    }
  };

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.title)}>
          {title ?? resolvedTier.label}
        </span>
        <AiModelTierInformationButton resolvedTier={resolvedTier} />
      </div>
      <div
        {...stylex.props(styles.track, disabled && styles.trackDisabled)}
        style={{ '--slider-step': selectedStep } as React.CSSProperties}
      >
        <div {...stylex.props(styles.fill)}>
          <div {...stylex.props(styles.handle)} />
        </div>
        <div {...stylex.props(styles.dots)}>
          {AI_MODEL_TIERS.map((tier, index) => (
            <span
              {...stylex.props(
                styles.dot,
                index <= selectedStep && styles.dotReached,
              )}
              key={tier}
            />
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={LAST_STEP}
          step={1}
          value={selectedStep}
          onChange={handleChange}
          disabled={disabled}
          aria-label={t`Model`}
          aria-valuetext={resolvedTier.label}
          {...stylex.props(styles.input)}
        />
      </div>
    </div>
  );
};
