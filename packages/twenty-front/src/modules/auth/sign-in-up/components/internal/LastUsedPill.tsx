import * as stylex from '@stylexjs/stylex';
import { useLingui } from '@lingui/react/macro';
import { Badge } from 'twenty-ui/primitives/data-display';
import {
  accent,
  borderRadius,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    position: 'absolute',
    right: '-14px',
    top: '-10px',
  },
  badge: {
    background: accent['--t-accent-accent3'],
    borderColor: accent['--t-accent-accent5'],
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'solid',
    borderWidth: '1px',
    cornerShape: 'round',
    color: accent['--t-accent-accent9'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    height: spacing['--t-spacing-5'],
  },
});

export const LastUsedPill = () => {
  const { t } = useLingui();

  return (
    <span {...stylex.props(styles.container)}>
      <Badge {...stylex.props(styles.badge)}>
        {t({
          message: 'Last',
          comment:
            'Short label (keep brief) indicating the most recently used login method',
        })}
      </Badge>
    </span>
  );
};
