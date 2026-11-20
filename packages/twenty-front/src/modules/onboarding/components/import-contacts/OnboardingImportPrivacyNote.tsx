import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { IconLock } from 'twenty-ui/icon';
import { themeCssVariables } from 'twenty-ui/theme';
import { spacing, fontColor, fontSize } from 'twenty-ui/theme/tokens.stylex';

const PRIVACY_NOTE_ICON_SIZE = 12;

const styles = stylex.create({
  note: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
  },
  noteText: {
    marginBlock: `calc((${PRIVACY_NOTE_ICON_SIZE}px - 1.4em) / 2)`,
    lineHeight: '1.4',
  },
});

export const OnboardingImportPrivacyNote = () => {
  const { t } = useLingui();

  return (
    <div {...stylex.props(styles.note)}>
      <IconLock
        size={PRIVACY_NOTE_ICON_SIZE}
        color={themeCssVariables.font.color.tertiary}
      />
      <span {...stylex.props(styles.noteText)}>
        {t`Only you will be able to see your emails and events`}
      </span>
    </div>
  );
};
