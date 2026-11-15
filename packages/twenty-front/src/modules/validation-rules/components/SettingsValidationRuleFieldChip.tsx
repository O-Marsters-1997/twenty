import { getChipLabel } from '@/ui/field/display/utils/getChipLabel';
import { useIcons } from 'twenty-ui/icon';
import { Chip } from 'twenty-ui/primitives/data-display';
import { useTheme } from 'twenty-ui/theme';

import { type ValidationRuleFieldNodeAttributes } from '@/validation-rules/types/ValidationRuleFieldNodeAttributes';
import * as stylex from '@stylexjs/stylex';
import { font, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  wrapper: {
    display: 'inline-block',
    fontFamily: font['--t-font-family'],
    paddingInline: spacing['--t-spacing-0_5'],
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  },
});

type SettingsValidationRuleFieldChipProps = ValidationRuleFieldNodeAttributes;

export const SettingsValidationRuleFieldChip = ({
  path,
  label,
  iconName,
}: SettingsValidationRuleFieldChipProps) => {
  const theme = useTheme();
  const { getIcon } = useIcons();

  const Icon = getIcon(iconName);

  return (
    <span {...stylex.props(styles.wrapper)}>
      <Chip
        variant="soft"
        title={path}
        startElement={<Icon size={theme.icon.size.sm} />}
      >
        {getChipLabel(label).content}
      </Chip>
    </span>
  );
};
