import * as stylex from '@stylexjs/stylex';
import {
  spacing,
  background,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
} from 'twenty-ui/theme/tokens.stylex';

const BADGE_ASSET_PATH = '/images/onboarding/trust-badges';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
    maxWidth: '100%',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-pill'],
    borderTopRightRadius: borderRadius['--t-border-radius-pill'],
    borderBottomRightRadius: borderRadius['--t-border-radius-pill'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-pill'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-light'],
    cornerShape: 'round',
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-7'],
    overflow: 'hidden',
    paddingTop: '0',
    paddingRight: '10px',
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
  },
  seal: {
    height: '21px',
    objectFit: 'contain',
    width: '21px',
  },
  badgeLabel: {
    whiteSpace: 'nowrap',
  },
});

type TrustBadgeProps = {
  label: string;
  sealSrc: string;
};

const TrustBadge = ({ label, sealSrc }: TrustBadgeProps) => (
  <div {...stylex.props(styles.badge)}>
    <img src={sealSrc} alt="" {...stylex.props(styles.seal)} />
    <span {...stylex.props(styles.badgeLabel)}>{label}</span>
  </div>
);

export const OnboardingTrustBadges = () => (
  <div {...stylex.props(styles.row)}>
    <TrustBadge label="SOC2" sealSrc={`${BADGE_ASSET_PATH}/soc2.png`} />
    <TrustBadge label="GDPR" sealSrc={`${BADGE_ASSET_PATH}/gdpr.png`} />
  </div>
);
