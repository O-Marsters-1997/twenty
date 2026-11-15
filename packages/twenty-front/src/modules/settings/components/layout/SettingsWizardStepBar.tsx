import { t } from '@lingui/core/macro';
import { type ReactNode } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronLeft } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { font, spacing } from 'twenty-ui/theme/tokens.stylex';

type SettingsWizardStepBarProps = {
  label: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
};

const styles = stylex.create({
  stepBar: {
    alignItems: 'center',
    display: 'grid',
    flex: '1',
    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
    minWidth: '0',
  },
  left: {
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  label: {
    color: font['--t-font-color-primary'],
    fontSize: font['--t-font-size-md'],
    fontWeight: font['--t-font-weight-semi-bold'],
    justifySelf: 'center',
    minWidth: '0',
    textAlign: 'center',
  },
  right: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'flex-end',
    minWidth: '0',
  },
});

export const SettingsWizardStepBar = ({
  label,
  onBack,
  trailing,
}: SettingsWizardStepBarProps) => (
  <div {...stylex.props(styles.stepBar)}>
    <div {...stylex.props(styles.left)}>
      {onBack && (
        <LightIconButton
          size="sm"
          emphasis="subtle"
          onClick={onBack}
          aria-label={t`Previous`}
        >
          <IconChevronLeft />
        </LightIconButton>
      )}
    </div>
    <div {...stylex.props(styles.label)}>{label}</div>
    <div {...stylex.props(styles.right)}>{trailing}</div>
  </div>
);
