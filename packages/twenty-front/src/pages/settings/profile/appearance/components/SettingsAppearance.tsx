import { useLingui } from '@lingui/react/macro';

import { currentWorkspaceMemberState } from '@/auth/states/currentWorkspaceMemberState';
import { useColorScheme } from '@/workspace-member/hooks/useColorScheme';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isDefined } from 'twenty-shared/utils';
import { Section } from 'twenty-ui/components/layout';
import { RadioGroup } from 'twenty-ui/primitives/input';
import { SettingsAppearanceOption } from '~/pages/settings/profile/appearance/components/SettingsAppearanceOption';
import { type ColorScheme } from '@/ui/theme/types/ColorScheme';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const styles = stylex.create({
  choices: {
    gap: spacing['--t-spacing-4'],
    flexDirection: 'row',
    overflowX: { default: null, [media.mobile]: 'auto' },
    width: '100%',
  },
});

export const SettingsAppearance = () => {
  const { t } = useLingui();
  const { colorScheme, setColorScheme } = useColorScheme();
  const currentWorkspaceMember = useAtomStateValue(currentWorkspaceMemberState);
  const choices: { value: ColorScheme; label: string }[] = [
    { value: 'Light', label: t`Light` },
    { value: 'Dark', label: t`Dark` },
    { value: 'System', label: t`System settings` },
  ];

  return (
    <Section.Root>
      <Section.Header title={t`Appearance`} />
      <RadioGroup
        render={<div {...stylex.props(styles.choices)} />}
        aria-label={t`Appearance`}
        value={colorScheme}
        disabled={!isDefined(currentWorkspaceMember)}
        onValueChange={(value: ColorScheme) => {
          void setColorScheme(value);
        }}
      >
        {choices.map(({ value, label }) => (
          <SettingsAppearanceOption
            key={value}
            colorScheme={value}
            label={label}
          />
        ))}
      </RadioGroup>
    </Section.Root>
  );
};
