import { t } from '@lingui/core/macro';

import { Section } from 'twenty-ui/components/layout';
import { IconKey, IconLego, IconUsers } from 'twenty-ui/icon';
import { Checkbox } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  checkboxContainer: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    paddingBlock: spacing['--t-spacing-1'],
    paddingInline: spacing['--t-spacing-1'],
    transition: `background-color calc(${animationDuration['--t-animation-duration-normal']} * 1s) ease`,
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
  },
  checkboxContainerDisabled: {
    cursor: 'not-allowed',
  },
  checkboxLabel: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
});

type SettingsRoleApplicabilityValues = {
  canBeAssignedToUsers: boolean;
  canBeAssignedToAgents: boolean;
  canBeAssignedToApiKeys: boolean;
};

type SettingsRoleApplicabilityProps = {
  values: SettingsRoleApplicabilityValues;
  onApplicabilityChange: (
    key: keyof SettingsRoleApplicabilityValues,
    value: boolean,
  ) => void;
  isEditable: boolean;
};

export const SettingsRoleApplicability = ({
  values,
  onApplicabilityChange,
  isEditable,
}: SettingsRoleApplicabilityProps) => {
  const theme = useTheme();

  const options = [
    {
      key: 'canBeAssignedToUsers' as const,
      label: t`Assignable to Workspace Members`,
      Icon: IconUsers,
    },
    {
      key: 'canBeAssignedToAgents' as const,
      label: t`Assignable to Agents`,
      Icon: IconLego,
    },
    {
      key: 'canBeAssignedToApiKeys' as const,
      label: t`Assignable to API Keys`,
      Icon: IconKey,
    },
  ];
  return (
    <Section.Root>
      <Section.Header
        title={t`Applicability`}
        description={t`Control which types of entities this role can be assigned to`}
      />
      <div>
        {options.map((option) => (
          <div
            {...stylex.props(
              styles.checkboxContainer,
              !isEditable && styles.checkboxContainerDisabled,
            )}
            key={option.key}
            onClick={() =>
              isEditable &&
              onApplicabilityChange(option.key, !values[option.key])
            }
          >
            <div {...stylex.props(styles.checkboxLabel)}>
              <option.Icon size={theme.icon.size.sm} />
              <span>{option.label}</span>
            </div>
            <Checkbox
              aria-label={option.label}
              checked={values[option.key]}
              onCheckedChange={(isChecked) => {
                onApplicabilityChange(option.key, isChecked);
              }}
              disabled={!isEditable}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ))}
      </div>
    </Section.Root>
  );
};
