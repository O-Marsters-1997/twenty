import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { Status } from 'twenty-ui/primitives/data-display';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { type ThemeColor } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
  },
});

type PageLayoutWidgetStatusDisplayProps = {
  tooltipId: string;
  text: string;
  tooltipContent: string;
  color?: ThemeColor;
};

export const PageLayoutWidgetStatusDisplay = ({
  tooltipId,
  text,
  tooltipContent,
  color = 'red',
}: PageLayoutWidgetStatusDisplayProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      <Tooltip
        delay={TooltipDelay.mediumDelay}
        content={tooltipContent}
        side="top"
      >
        <div id={tooltipId}>
          <Status color={color}>{text}</Status>
        </div>
      </Tooltip>
    </div>
  );
};
