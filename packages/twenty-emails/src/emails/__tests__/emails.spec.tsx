import { type ComponentType, createElement } from 'react';

import { renderEmail } from 'src/utils/render-email';

import PasswordResetLinkEmail from 'src/emails/password-reset-link.email';
import PasswordUpdateNotifyEmail from 'src/emails/password-update-notify.email';
import SendEmailVerificationLinkEmail from 'src/emails/send-email-verification-link.email';
import SendInviteLinkEmail from 'src/emails/send-invite-link.email';
import TestEmail from 'src/emails/test.email';
import TwoFactorAuthenticationRecoveryCodeIssuedEmail from 'src/emails/two-factor-authentication-recovery-code-issued.email';
import TwoFactorAuthenticationResetEmail from 'src/emails/two-factor-authentication-reset.email';
import SendApprovedAccessDomainValidation from 'src/emails/validate-approved-access-domain.email';

type PreviewableEmail = ComponentType<object> & { PreviewProps: object };

const TEMPLATES: Record<string, PreviewableEmail> = {
  'password-reset-link': PasswordResetLinkEmail,
  'password-update-notify': PasswordUpdateNotifyEmail,
  'send-email-verification-link': SendEmailVerificationLinkEmail,
  'send-invite-link': SendInviteLinkEmail,
  test: TestEmail,
  'two-factor-authentication-recovery-code-issued':
    TwoFactorAuthenticationRecoveryCodeIssuedEmail,
  'two-factor-authentication-reset': TwoFactorAuthenticationResetEmail,
  'validate-approved-access-domain': SendApprovedAccessDomainValidation,
};

describe('email templates', () => {
  beforeAll(() => {
    jest.useFakeTimers({
      now: new Date('2026-01-15T10:00:00Z'),
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it.each(Object.entries(TEMPLATES))(
    'renders %s to stable HTML',
    async (_name, Template) => {
      const html = await renderEmail(
        createElement(Template, Template.PreviewProps),
      );

      expect(html).toMatchSnapshot();
    },
  );
});
