import { useLingui } from '@lingui/react/macro';
import { useState } from 'react';
import { IconX } from 'twenty-ui/icon';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { useTheme } from 'twenty-ui/theme';

import ClaudeLogo from '@/settings/mcp-and-apis/assets/mcp-clients/claude-color.png';
import CursorLogo from '@/settings/mcp-and-apis/assets/mcp-clients/cursor.svg';
import GeminiCliLogo from '@/settings/mcp-and-apis/assets/mcp-clients/gemini-cli.svg';
import OpenAiLogo from '@/settings/mcp-and-apis/assets/mcp-clients/openai.svg';
import { McpClientLogo } from '@/settings/mcp-and-apis/components/McpClientLogo';
import { buildEmailingDomainAiSetupPrompt } from '@/settings/emailing-domains/utils/buildEmailingDomainAiSetupPrompt';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { containerMarker } from './SettingsEmailingDomainAiSetup.stylex';
import {
  animationDuration,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsEmailingDomainAiSetupProps = {
  domain: string;
  records: {
    type: string;
    key: string;
    value: string;
    priority?: number | null;
  }[];
};

const styles = stylex.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    display: 'inline-flex',
    position: 'relative',
    maxWidth: '100%',
  },
  promptButton: {
    borderColor: {
      default: borderColor['--t-border-color-light'],
      ':focus-visible': borderColor['--t-border-color-medium'],
      ':hover': borderColor['--t-border-color-medium'],
    },
    borderRadius: borderRadius['--t-border-radius-pill'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-2'],
    paddingBlock: 0,
    paddingInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: {
      default: backgroundTransparent['--t-background-transparent-lighter'],
      ':focus-visible':
        backgroundTransparent['--t-background-transparent-light'],
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    color: {
      default: fontColor['--t-font-color-secondary'],
      ':focus-visible': fontColor['--t-font-color-primary'],
      ':hover': fontColor['--t-font-color-primary'],
    },
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-sm'],
    outlineColor: borderColor['--t-border-color-blue'],
    outlineOffset: '2px',
    outlineStyle: { default: null, ':focus-visible': 'solid' },
    outlineWidth: '2px',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'background',
    transitionTimingFunction: 'ease',
    minHeight: spacing['--t-spacing-7'],
    minWidth: 0,
  },
  buttonLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logos: {
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: 'auto',
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
  },
  logo: {
    display: 'block',
    height: spacing['--t-spacing-4'],
    width: spacing['--t-spacing-4'],
  },
  dismissButton: {
    borderRadius: borderRadius['--t-border-radius-rounded'],
    borderWidth: 0,
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    insetInlineEnd: `calc(-1 * ${spacing['--t-spacing-7']})`,
    justifyContent: 'center',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':focus-within', containerMarker)]: 1,
      [stylex.when.ancestor(':hover', containerMarker)]: 1,
      '@media (hover: none)': 1,
    },
    position: 'absolute',
    transform: 'translateY(-50%)',
    transitionDuration: `calc(${animationDuration['--t-animation-duration-normal']} * 1s)`,
    transitionProperty: 'opacity',
    transitionTimingFunction: 'ease',
    visibility: {
      default: 'hidden',
      [stylex.when.ancestor(':focus-within', containerMarker)]: 'visible',
      [stylex.when.ancestor(':hover', containerMarker)]: 'visible',
      '@media (hover: none)': 'visible',
    },
    height: spacing['--t-spacing-6'],
    top: '50%',
    width: spacing['--t-spacing-6'],
  },
});

export const SettingsEmailingDomainAiSetup = ({
  domain,
  records,
}: SettingsEmailingDomainAiSetupProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const { copyToClipboard } = useCopyToClipboard();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleCopy = () => {
    copyToClipboard(buildEmailingDomainAiSetupPrompt({ domain, records }));
  };

  return (
    <div {...stylex.props(styles.container, containerMarker)}>
      <Tooltip
        content={t`Copies a Cloudflare setup prompt for your AI coding tool`}
        maxWidth="440px"
      >
        <button
          type="button"
          onClick={handleCopy}
          {...stylex.props(styles.promptButton)}
        >
          <span
            {...stylex.props(styles.buttonLabel)}
          >{t`Set up DNS with AI`}</span>
          <span aria-hidden="true" {...stylex.props(styles.logos)}>
            <span {...stylex.props(styles.logo)}>
              <McpClientLogo src={ClaudeLogo} />
            </span>
            <span {...stylex.props(styles.logo)}>
              <McpClientLogo src={OpenAiLogo} invertInDarkMode />
            </span>
            <span {...stylex.props(styles.logo)}>
              <McpClientLogo src={CursorLogo} invertInDarkMode />
            </span>
            <span {...stylex.props(styles.logo)}>
              <McpClientLogo src={GeminiCliLogo} />
            </span>
          </span>
        </button>
      </Tooltip>
      <button
        type="button"
        aria-label={t`Dismiss AI setup prompt`}
        onClick={() => setIsDismissed(true)}
        {...stylex.props(styles.dismissButton)}
      >
        <IconX size={theme.icon.size.sm} />
      </button>
    </div>
  );
};
