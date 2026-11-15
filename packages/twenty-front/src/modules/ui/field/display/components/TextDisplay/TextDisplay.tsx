import { isUndefined } from '@sniptt/guards';
import * as stylex from '@stylexjs/stylex';
import { useMemo } from 'react';

import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { LinkifiedText } from '@/ui/field/display/components/LinkifiedText/LinkifiedText';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    height: 'auto',
  },
  fixHeight: {
    height: '20px',
  },
});

type TextDisplayProps = {
  text: string;
  displayedMaxRows?: number;
};

export const TextDisplay = ({ text, displayedMaxRows }: TextDisplayProps) => {
  const linkifiedText = useMemo(() => <LinkifiedText text={text} />, [text]);
  const fixHeight = isUndefined(displayedMaxRows) || displayedMaxRows === 1;

  return (
    <div {...stylex.props(styles.container, fixHeight && styles.fixHeight)}>
      <OverflowingTextWithTooltip
        text={linkifiedText}
        tooltipContent={text}
        lineClamp={displayedMaxRows}
        isTooltipMultiline={true}
      />
    </div>
  );
};
