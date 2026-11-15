import { useCurrentWidget } from '@/page-layout/widgets/hooks/useCurrentWidget';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { t } from '@lingui/core/macro';
import { type FallbackProps } from 'react-error-boundary';
import { Status } from 'twenty-ui/primitives/data-display';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import * as stylex from '@stylexjs/stylex';

type PageLayoutWidgetInvalidConfigDisplayProps = FallbackProps;

const styles = stylex.create({
  invalidConfigContainer: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
});

export const PageLayoutWidgetInvalidConfigDisplay = ({
  error,
}: PageLayoutWidgetInvalidConfigDisplayProps) => {
  const widget = useCurrentWidget();
  const tooltipId = `widget-invalid-config-tooltip-${widget.id}`;

  const text = t`Invalid Configuration`;
  const errorMessage = error instanceof Error ? error.message : String(error);
  const tooltipContent = t`Invalid configuration: ${errorMessage}`;

  return (
    <div {...stylex.props(styles.invalidConfigContainer)}>
      <Tooltip
        delay={TooltipDelay.mediumDelay}
        content={tooltipContent}
        side="top"
      >
        <div id={tooltipId}>
          <Status color="red">{text}</Status>
        </div>
      </Tooltip>
    </div>
  );
};
