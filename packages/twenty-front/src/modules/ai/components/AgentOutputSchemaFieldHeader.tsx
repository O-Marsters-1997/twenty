import { t } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconChevronDown, IconVariable, IconX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { animationDuration, backgroundTransparent, borderColor, borderRadius, color, fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

type AgentOutputSchemaFieldHeaderProps = {
  name: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove?: () => void;
};

const styles = stylex.create({
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
  },
  headerExpanded: {
    boxShadow: `inset 0 -1px 0 ${borderColor['--t-border-color-medium']}`,
  },
  title: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    minWidth: 0,
  },
  titleIcon: {
    display: 'flex',
    flexShrink: 0,
  },
  chevron: {
    alignItems: 'center',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    flexShrink: 0,
    height: spacing['--t-spacing-6'],
    justifyContent: 'center',
    transform: 'rotate(0deg)',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: {
      default: 'transform',
      [media.reducedMotion]: 'none',
    },
    transitionTimingFunction: 'ease',
    width: spacing['--t-spacing-6'],
  },
  chevronExpanded: {
    transform: 'rotate(-180deg)',
  },
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

export const AgentOutputSchemaFieldHeader = ({
  name,
  isExpanded,
  onToggle,
  onRemove,
}: AgentOutputSchemaFieldHeaderProps) => {
  const theme = useTheme();

  return (
    <div
      {...stylex.props(styles.header, isExpanded && styles.headerExpanded)}
    >
      <button type="button" aria-expanded={isExpanded} onClick={onToggle} {...stylex.props(styles.toggle)}>
        <span {...stylex.props(styles.title)}>
          <span {...stylex.props(styles.titleIcon)}>
            <IconVariable size={theme.icon.size.sm} aria-hidden />
          </span>
          <span {...stylex.props(styles.name)}>
            {isNonEmptyString(name) ? name : t`Untitled field`}
          </span>
        </span>
        <span
          {...stylex.props(styles.chevron, isExpanded && styles.chevronExpanded)}
          aria-hidden
        >
          <IconChevronDown size={theme.icon.size.sm} />
        </span>
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
    </div>
  );
};
