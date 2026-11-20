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
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  badge: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    cornerShape: 'round',
    gap: spacing['--t-spacing-1'],
    overflow: 'hidden',
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-xs'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-pill'],
    borderBottomRightRadius: borderRadius['--t-border-radius-pill'],
    borderTopLeftRadius: borderRadius['--t-border-radius-pill'],
    borderTopRightRadius: borderRadius['--t-border-radius-pill'],
    height: spacing['--t-spacing-7'],
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: '10px',
    paddingTop: '0',
  },
  seal: {
    objectFit: 'contain',
    height: '21px',
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
