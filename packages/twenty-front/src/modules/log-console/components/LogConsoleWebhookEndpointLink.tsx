import { getUrlHostnameOrThrow, isValidUrl } from 'twenty-shared/utils';
import { Tooltip } from 'twenty-ui/primitives/surfaces';

import { LinkDisplay } from '@/ui/field/display/components/LinkDisplay';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  linkTrigger: {
    display: 'inline-flex',
    minWidth: '0',
  },
});

type LogConsoleWebhookEndpointLinkProps = {
  url: string;
};

export const LogConsoleWebhookEndpointLink = ({
  url,
}: LogConsoleWebhookEndpointLinkProps) => (
  <Tooltip content={url} delay={TooltipDelay.mediumDelay}>
    <span {...stylex.props(styles.linkTrigger)}>
      <LinkDisplay
        value={{
          url,
          label: isValidUrl(url) ? getUrlHostnameOrThrow(url) : url,
        }}
      />
    </span>
  </Tooltip>
);
