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
const LAST_STEP = 4;

const styles = stylex.create({
  track: {
    borderRadius: borderRadius['--t-border-radius-md'],
    cornerShape: 'round',
    backgroundColor: background['--t-background-tertiary'],
    boxShadow: {
      default: null,
      ':has(input:focus-visible)': `0 0 0 3px ${color['--t-color-blue3']}`,
    },
    cursor: 'pointer',
    position: 'relative',
    height: `${TRACK_HEIGHT_PX}px`,
    width: '100%',
  },
  trackDisabled: {
    cursor: 'not-allowed',
    opacity: 0.5,
  },
  fill: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    cornerShape: 'round',
    backgroundColor: color['--t-color-blue'],
    position: 'absolute',
    transitionDuration: '180ms',
    transitionProperty: {
      default: 'width',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    height: `${TRACK_HEIGHT_PX - 2 * TRACK_INSET_PX}px`,
    left: `${TRACK_INSET_PX}px`,
    top: `${TRACK_INSET_PX}px`,
    width: `calc(${DOT_CENTER_INSET_PX - TRACK_INSET_PX + HANDLE_WIDTH_PX / 2}px + var(--slider-step) * (100% - ${2 * DOT_CENTER_INSET_PX}px) / ${LAST_STEP})`,
  },
  dots: {
    insetBlock: 0,
    insetInline: `${DOT_CENTER_INSET_PX - 2}px`,
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    position: 'absolute',
  },
  dot: {
    borderRadius: borderRadius['--t-border-radius-rounded'],
    cornerShape: 'round',
    alignSelf: 'center',
    backgroundColor: borderColor['--t-border-color-strong'],
    transitionDuration: '180ms',
    transitionProperty: {
      default: 'background-color',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease-out',
    height: '4px',
    width: '4px',
  },
  dotReached: {
    // oxlint-disable-next-line twenty/no-hardcoded-colors -- Dots must remain translucent white over the blue track in both themes.
    backgroundColor: 'rgba(255, 255, 255, 0.386)',
  },
  handle: {
    borderRadius: borderRadius['--t-border-radius-md'],
    cornerShape: 'round',
    backgroundColor: 'white',
    boxShadow: boxShadow['--t-box-shadow-light'],
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translateY(-50%)',
    height: `${HANDLE_HEIGHT_PX}px`,
    right: 0,
    top: '50%',
    width: `${HANDLE_WIDTH_PX}px`,
  },
  container: {
    gap: spacing['--t-spacing-3'],
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    height: '20px',
  },
  title: {
    overflow: 'hidden',
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  input: {
    background: 'transparent',
    inset: '0',
    appearance: 'none',
    cursor: 'inherit',
    opacity: '0',
    position: 'absolute',
    height: '100%',
    marginBottom: '0',
    marginLeft: '0',
    marginRight: '0',
    marginTop: '0',
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
