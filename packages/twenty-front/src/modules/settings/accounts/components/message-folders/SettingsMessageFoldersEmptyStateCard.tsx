import { t } from '@lingui/core/macro';
import { Section } from 'twenty-ui/components/layout';
import { IconFolder } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  emptyState: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
    paddingBottom: spacing['--t-spacing-8'],
    paddingLeft: spacing['--t-spacing-8'],
    paddingRight: spacing['--t-spacing-8'],
    paddingTop: spacing['--t-spacing-8'],
  },
});

export const SettingsMessageFoldersEmptyStateCard = () => {
  const theme = useTheme();

  return (
    <Section.Root>
      <div {...stylex.props(styles.emptyState)}>
        <IconFolder size={theme.icon.size.md} />
        <div>{t`No folders found for this account`}</div>
      </div>
    </Section.Root>
  );
};
