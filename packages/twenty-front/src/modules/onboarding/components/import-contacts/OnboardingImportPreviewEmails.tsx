import {
  type ImportContactsPreviewCalendarEvent,
  IMPORT_CONTACTS_PREVIEW_CALENDAR_EVENTS,
} from '@/onboarding/constants/ImportContactsPreviewCalendarEvents';
import {
  type ImportContactsPreviewEmail,
  IMPORT_CONTACTS_PREVIEW_EMAILS,
} from '@/onboarding/constants/ImportContactsPreviewEmails';
import * as stylex from '@stylexjs/stylex';
import { isDefined } from 'twenty-shared/utils';
import { media } from 'twenty-ui/theme/constants.stylex';
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

const EVENT_CARD_WIDTH = 160;

const orangeCardIn = stylex.keyframes({
  from: {
    opacity: 0,
    transform: 'translate(8px, -10px) rotate(-2deg) scale(0.94)',
  },
  to: { opacity: 1, transform: 'rotate(-7deg)' },
});

const skyCardIn = stylex.keyframes({
  from: {
    opacity: 0,
    transform: 'translate(8px, 10px) rotate(5deg) scale(0.94)',
  },
  to: { opacity: 1, transform: 'rotate(10deg)' },
});

const styles = stylex.create({
  column: {
    backgroundColor: borderColor['--t-border-color-light'],
    boxSizing: 'border-box',
    display: 'flex',
    flex: '1 1 0',
    flexDirection: 'column',
    gap: '1px',
    height: '100%',
    minWidth: '0',
    overflow: 'hidden',
    position: 'relative',
  },
  emailRow: {
    alignItems: 'center',
    backgroundColor: background['--t-background-primary'],
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: '0',
    fontSize: fontSize['--t-font-size-sm'],
    gap: spacing['--t-spacing-3'],
    height: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    whiteSpace: 'nowrap',
  },
  emailCheckbox: {
    borderColor: fontColor['--t-font-color-light'],
    borderRadius: borderRadius['--t-border-radius-xs'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'border-box',
    flexShrink: '0',
    height: spacing['--t-spacing-3'],
    width: spacing['--t-spacing-3'],
  },
  emailCheckboxSelected: {
    borderColor: fontColor['--t-font-color-primary'],
  },
  emailStar: {
    backgroundColor: fontColor['--t-font-color-light'],
    flexShrink: '0',
    height: spacing['--t-spacing-3'],
    maskImage: "url('/images/onboarding/import-preview/star.svg')",
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
    width: spacing['--t-spacing-3'],
  },
  emailStarSelected: {
    backgroundColor: fontColor['--t-font-color-primary'],
  },
  emailSender: {
    flexShrink: '0',
    fontWeight: fontWeight['--t-font-weight-regular'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    width: spacing['--t-spacing-30'],
  },
  emailSenderMedium: {
    fontWeight: fontWeight['--t-font-weight-medium'],
  },
  senderPrimary: {
    color: fontColor['--t-font-color-primary'],
  },
  senderSecondary: {
    color: fontColor['--t-font-color-secondary'],
  },
  senderTertiary: {
    color: fontColor['--t-font-color-tertiary'],
  },
  emailSubject: {
    color: fontColor['--t-font-color-secondary'],
  },
  eventCard: {
    animationDuration: '900ms',
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
    borderLeftStyle: 'solid',
    borderLeftWidth: '2px',
    borderRadius: borderRadius['--t-border-radius-md'],
    boxShadow: boxShadow['--t-box-shadow-strong'],
    boxSizing: 'border-box',
    display: { default: 'flex', [media.mobile]: 'none' },
    flexDirection: 'column',
    gap: spacing['--t-spacing-1'],
    lineHeight: '1.1',
    overflow: 'hidden',
    padding: spacing['--t-spacing-2'],
    position: 'absolute',
    width: `${EVENT_CARD_WIDTH}px`,
  },
  eventCardOrange: {
    animationDelay: '300ms',
    animationName: { default: orangeCardIn, [media.reducedMotion]: 'none' },
    backgroundColor: color['--t-color-orange3'],
    borderLeftColor: color['--t-color-orange11'],
    color: color['--t-color-orange11'],
    left: 21,
    top: 159,
    transform: 'rotate(-7deg)',
  },
  eventCardSky: {
    animationDelay: '150ms',
    animationName: { default: skyCardIn, [media.reducedMotion]: 'none' },
    backgroundColor: color['--t-color-sky3'],
    borderLeftColor: color['--t-color-sky11'],
    color: color['--t-color-sky11'],
    left: 43,
    top: -5,
    transform: 'rotate(10deg)',
  },
  eventTitle: {
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
  },
  eventTime: {
    fontSize: fontSize['--t-font-size-xs'],
  },
});

const SENDER_COLOR_STYLES: Record<
  ImportContactsPreviewEmail['senderColor'],
  stylex.StyleXStyles
> = {
  primary: styles.senderPrimary,
  secondary: styles.senderSecondary,
  tertiary: styles.senderTertiary,
};

const EVENT_CARD_STYLES: Record<
  ImportContactsPreviewCalendarEvent['color'],
  stylex.StyleXStyles
> = {
  orange: styles.eventCardOrange,
  sky: styles.eventCardSky,
};

const EmailRow = ({ email }: { email: ImportContactsPreviewEmail }) => (
  <div {...stylex.props(styles.emailRow)}>
    <div
      {...stylex.props(
        styles.emailCheckbox,
        email.isSelected && styles.emailCheckboxSelected,
      )}
    />
    <span
      {...stylex.props(
        styles.emailStar,
        email.isSelected && styles.emailStarSelected,
      )}
    />
    <span
      {...stylex.props(
        styles.emailSender,
        email.isSenderMedium && styles.emailSenderMedium,
        SENDER_COLOR_STYLES[email.senderColor],
      )}
    >
      {email.sender}
    </span>
    {isDefined(email.subject) && (
      <span {...stylex.props(styles.emailSubject)}>{email.subject}</span>
    )}
  </div>
);

const EventCard = ({
  event,
}: {
  event: ImportContactsPreviewCalendarEvent;
}) => (
  <div {...stylex.props(styles.eventCard, EVENT_CARD_STYLES[event.color])}>
    <span {...stylex.props(styles.eventTitle)}>{event.title}</span>
    <span {...stylex.props(styles.eventTime)}>{event.time}</span>
  </div>
);

export const OnboardingImportPreviewEmails = () => (
  <div {...stylex.props(styles.column)}>
    {IMPORT_CONTACTS_PREVIEW_EMAILS.map((email) => (
      <EmailRow key={email.id} email={email} />
    ))}
    {IMPORT_CONTACTS_PREVIEW_CALENDAR_EVENTS.map((event) => (
      <EventCard key={event.id} event={event} />
    ))}
  </div>
);
