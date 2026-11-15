import { isDefined } from 'twenty-shared/utils';

import { type McpSetupCard } from '@/settings/mcp-and-apis/types/McpSetup';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { IconExternalLink } from 'twenty-ui/icon';
import { Badge } from 'twenty-ui/primitives/data-display';
import { Card, Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  cardContent: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-4'],
    minWidth: 0,
    paddingTop: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-4'],
  },
  logo: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    flex: `0 0 ${spacing['--t-spacing-8']}`,
    height: spacing['--t-spacing-8'],
    justifyContent: 'center',
    width: spacing['--t-spacing-8'],
  },
  body: {
    alignSelf: 'stretch',
    display: 'flex',
    flex: '1 1 0',
    flexDirection: 'column',
    gap: spacing['--t-spacing-2'],
    minWidth: 0,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    minWidth: 0,
  },
  title: {
    color: fontColor['--t-font-color-primary'],
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actionSlot: {
    display: 'flex',
    flex: '0 0 auto',
    marginLeft: 'auto',
  },
  description: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-sm'],
  },
  // Install links use custom URI schemes (goose://, vscode:, lmstudio://) that
  // twenty-ui Button/RawLink/RoundedLink strip through react-router or getSafeUrl,
  // so the call to action has to stay a raw anchor with the untouched href.
  installAction: {
    alignItems: 'center',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderColor: backgroundTransparent['--t-background-transparent-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-secondary'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-1'],
    height: spacing['--t-spacing-6'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  installActionDisabled: {
    color: fontColor['--t-font-color-light'],
    cursor: 'not-allowed',
  },
});

type SettingsMcpSetupCardActionProps = {
  card: McpSetupCard;
};

const SettingsMcpSetupCardAction = ({
  card,
}: SettingsMcpSetupCardActionProps) => {
  const theme = useTheme();

  if (card.isDisabled === true) {
    return (
      <Tooltip
        content={card.disabledTooltip}
        delay={TooltipDelay.shortDelay}
        side="bottom"
        positionMethod="fixed"
        disabled={
          !(isDefined(card.disabledTooltip) && isDefined(card.tooltipId))
        }
      >
        <span
          aria-disabled="true"
          data-tooltip-id={card.tooltipId}
          {...stylex.props(styles.installAction, styles.installActionDisabled)}
        >
          <IconExternalLink size={theme.icon.size.sm} />
          {card.ctaLabel}
        </span>
      </Tooltip>
    );
  }

  if (!isDefined(card.href)) {
    return null;
  }

  return (
    <a
      href={card.href}
      rel="noopener noreferrer"
      target="_blank"
      {...stylex.props(styles.installAction)}
    >
      <IconExternalLink size={theme.icon.size.sm} />
      {card.ctaLabel}
    </a>
  );
};

type SettingsMcpSetupCardProps = {
  card: McpSetupCard;
};

export const SettingsMcpSetupCard = ({ card }: SettingsMcpSetupCardProps) => (
  <Card.Root rounded>
    <Card.Content {...stylex.props(styles.cardContent)}>
      <div aria-hidden {...stylex.props(styles.logo)}>
        {card.logo}
      </div>
      <div {...stylex.props(styles.body)}>
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.title)}>{card.title}</div>
          <Badge>{card.badge}</Badge>
          <div {...stylex.props(styles.actionSlot)}>
            <SettingsMcpSetupCardAction card={card} />
          </div>
        </div>
        <div {...stylex.props(styles.description)}>{card.description}</div>
      </div>
    </Card.Content>
  </Card.Root>
);
