import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronDown, IconVariable, IconX } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, borderRadius, color, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

type AgentOutputSchemaFieldHeaderProps = {
  name: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
};

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  padding-right: ${themeCssVariables.spacing[1]};

  &[data-expanded='true'] {
    box-shadow: inset 0 -1px 0 ${themeCssVariables.border.color.medium};
  }
`;

const styles = stylex.create({
  toggle: {
    alignItems: 'center',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-8'],
    justifyContent: 'space-between',
    minWidth: '0',
    paddingLeft: spacing['--t-spacing-2'],
    textAlign: 'left',
    background: { default: null, ':hover': backgroundTransparent['--t-background-transparent-light'], ':active': backgroundTransparent['--t-background-transparent-medium'] },
    outline: { default: null, ':focus-visible': `2px solid ${color['--t-color-blue']}` },
    outlineOffset: { default: null, ':focus-visible': '1px' },
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

const StyledTitle = styled.span`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;

  & > svg {
    flex-shrink: 0;
  }
`;

const StyledChevron = styled.span`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-shrink: 0;
  height: ${themeCssVariables.spacing[6]};
  justify-content: center;
  transition: transform
    calc(${themeCssVariables.animation.duration.normal} * 1s) ease;
  width: ${themeCssVariables.spacing[6]};

  &[data-expanded='true'] {
    transform: rotate(-180deg);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const AgentOutputSchemaFieldHeader = ({
  name,
  isExpanded,
  onToggle,
  onRemove,
}: AgentOutputSchemaFieldHeaderProps) => {
  const theme = useTheme();

  return (
    <StyledHeader data-expanded={isExpanded}>
      <button type="button" aria-expanded={isExpanded} onClick={onToggle} {...stylex.props(styles.toggle)}>
        <StyledTitle>
          <IconVariable size={theme.icon.size.sm} aria-hidden />
          <span {...stylex.props(styles.name)}>
            {isNonEmptyString(name) ? name : t`Untitled field`}
          </span>
        </StyledTitle>
        <StyledChevron data-expanded={isExpanded} aria-hidden>
          <IconChevronDown size={theme.icon.size.sm} />
        </StyledChevron>
      </button>
      {isDefined(onRemove) && (
        <LightIconButton
          data-testid="remove-output-field-button"
          size="sm"
          onClick={onRemove}
          aria-label={t`Remove output field`}
        >
          <IconX />
        </LightIconButton>
      )}
    </StyledHeader>
  );
};
