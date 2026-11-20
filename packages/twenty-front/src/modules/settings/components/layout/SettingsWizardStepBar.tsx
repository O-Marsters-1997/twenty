import { t } from '@lingui/core/macro';
import { type ReactNode } from 'react';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronLeft } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import {
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsWizardStepBarProps = {
  label: ReactNode;
  onBack?: () => void;
  trailing?: ReactNode;
};

const styles = stylex.create({
  stepBar: {
    flex: '1',
    alignItems: 'center',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
    minWidth: '0',
  },
  left: {
    alignItems: 'center',
    display: 'flex',
    minWidth: '0',
  },
  label: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-semi-bold'],
    justifySelf: 'center',
    textAlign: 'center',
    minWidth: '0',
  },
  right: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
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
