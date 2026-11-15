import { t } from '@lingui/core/macro';
import { useRef, useState } from 'react';

import { JsonDisplay } from '@/ui/field/display/components/JsonDisplay/JsonDisplay';
import { ExpandedFieldDisplay } from '@/ui/layout/expandable-list/components/ExpandedFieldDisplay';
import { isDefined } from 'twenty-shared/utils';
import { JsonTree } from 'twenty-ui/components/data-display';
import { type JsonValue } from 'type-fest';
import { useCopyToClipboard } from '~/hooks/useCopyToClipboard';
import * as stylex from '@stylexjs/stylex';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';

type EventLogJsonCellProps = {
  value: Record<string, unknown> | null | undefined;
};

const styles = stylex.create({
  jsonContainer: {
    cursor: 'pointer',
  },
  emptyCell: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

export const EventLogJsonCell = ({ value }: EventLogJsonCellProps) => {
  const { copyToClipboard } = useCopyToClipboard();
  const [isExpanded, setIsExpanded] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  if (!isDefined(value) || Object.keys(value).length === 0) {
    return <span {...stylex.props(styles.emptyCell)}>-</span>;
  }

  const handleClick = () => {
    setIsExpanded(true);
  };

  const handleClickOutside = () => {
    setIsExpanded(false);
  };

  return (
    <>
      <div
        ref={anchorRef}
        onClick={handleClick}
        {...stylex.props(styles.jsonContainer)}
      >
        <JsonDisplay text={JSON.stringify(value)} />
      </div>
      {isExpanded && (
        <ExpandedFieldDisplay
          anchorElement={anchorRef.current ?? undefined}
          onClickOutside={handleClickOutside}
        >
          <JsonTree
            value={value as JsonValue}
            emptyArrayLabel={t`Empty Array`}
            emptyObjectLabel={t`Empty Object`}
            emptyStringLabel={t`[empty string]`}
            arrowButtonCollapsedLabel={t`Expand`}
            arrowButtonExpandedLabel={t`Collapse`}
            onNodeValueClick={copyToClipboard}
          />
        </ExpandedFieldDisplay>
      )}
    </>
  );
};
