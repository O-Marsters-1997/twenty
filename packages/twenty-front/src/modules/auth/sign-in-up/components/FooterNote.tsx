import { Trans, useLingui } from '@lingui/react/macro';

import { getTwentyWebsiteUrl } from '@/auth/utils/getTwentyWebsiteUrl';
import { useIsCurrentLocationOnAWorkspace } from '@/domain-manager/hooks/useIsCurrentLocationOnAWorkspace';
import * as stylex from '@stylexjs/stylex';
import { type ReactNode } from 'react';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

import { onboardingLayout } from '../../../onboarding/constants/onboardingLayout.stylex';

const styles = stylex.create({
  copyContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    lineHeight: 1.4,
    textAlign: 'center',
    maxWidth: onboardingLayout.contentBlockWidth,
  },
  linksContainer: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexWrap: 'nowrap',
    fontSize: fontSize['--t-font-size-sm'],
    justifyContent: 'center',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  link: {
    textDecoration: {
      default: 'none',
      ':hover': 'underline',
    },
    color: fontColor['--t-font-color-tertiary'],
  },
  separator: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

const FooterLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    {...stylex.props(styles.link)}
  >
    {children}
  </a>
);

type FooterNoteProps = {
  secondaryAgreement?: 'privacyPolicy' | 'dataProcessingAgreement';
};

export const FooterNote = ({
  secondaryAgreement = 'privacyPolicy',
}: FooterNoteProps) => {
  const { isOnAWorkspace } = useIsCurrentLocationOnAWorkspace();
  const { i18n } = useLingui();

  if (!isOnAWorkspace) {
    return (
      <div {...stylex.props(styles.copyContainer)}>
        <Trans>By using Twenty, you agree to the</Trans>{' '}
        <FooterLink href={getTwentyWebsiteUrl(i18n.locale, 'terms')}>
          <Trans>Terms of Service</Trans>
        </FooterLink>{' '}
        <Trans>and</Trans>{' '}
        {secondaryAgreement === 'dataProcessingAgreement' ? (
          <FooterLink href="https://twenty.com/legal/dpa">
            <Trans>Data Processing Agreement</Trans>
          </FooterLink>
        ) : (
          <FooterLink href={getTwentyWebsiteUrl(i18n.locale, 'privacy-policy')}>
            <Trans>Privacy Policy</Trans>
          </FooterLink>
        )}
        .
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.linksContainer)}>
      <FooterLink href={getTwentyWebsiteUrl(i18n.locale, 'privacy-policy')}>
        <Trans>Privacy Policy</Trans>
      </FooterLink>
      <span {...stylex.props(styles.separator)}>•</span>
      <FooterLink href={getTwentyWebsiteUrl(i18n.locale, 'terms')}>
        <Trans>Terms of Service</Trans>
      </FooterLink>
    </div>
  );
};
