import { Collapsible } from '@base-ui/react/collapsible';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from '@ui/utilities/utils/isDefined';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { type JsonValue } from 'type-fest';

import { JsonArrow } from '@ui/components/data-display/JsonTree/internal/JsonArrow';
import { JsonNode } from '@ui/components/data-display/JsonTree/internal/JsonNode';
import { JsonNodeLabel } from '@ui/components/data-display/JsonTree/internal/JsonNodeLabel';
import { JsonValueNode } from '@ui/components/data-display/JsonTree/internal/JsonValueNode';
import { useJsonTreeContextOrThrow } from '@ui/components/data-display/JsonTree/internal/hooks/useJsonTreeContextOrThrow';
import { type JsonNodeHighlighting } from '@ui/components/data-display/JsonTree/types/JsonNodeHighlighting';
import { type IconComponent } from '@ui/icon';

import { fontColor, spacing } from '../../../../theme/tokens.stylex';

export const JsonNestedNode = ({
  label,
  Icon,
  elements,
  renderElementsCount,
  emptyElementsText,
  depth,
  keyPath,
  highlighting,
}: {
  label?: string;
  Icon: IconComponent;
  elements: Array<{ id: string | number; label: string; value: JsonValue }>;
  renderElementsCount?: (count: number) => string;
  emptyElementsText: string;
  depth: number;
  keyPath: string;
  highlighting?: JsonNodeHighlighting | undefined;
}) => {
  const { shouldExpandNodeInitially } = useJsonTreeContextOrThrow();

  const hideRoot = !isDefined(label);

  const [isOpen, setIsOpen] = useState(
    shouldExpandNodeInitially({ keyPath, depth }),
  );

  const renderedChildren = (
    <ul {...stylex.props(styles.list, depth > 0 && styles.nested)}>
      {elements.length === 0 ? (
        <JsonValueNode
          valueAsString={emptyElementsText}
          highlighting={undefined}
        />
      ) : (
        elements.map(({ id, label, value }) => {
          const nextKeyPath = isNonEmptyString(keyPath)
            ? `${keyPath}.${id}`
            : String(id);

          return (
            <JsonNode
              key={id}
              label={label}
              value={value}
              depth={depth + 1}
              keyPath={nextKeyPath}
            />
          );
        })
      )}
    </ul>
  );

  const handleArrowClick = () => {
    setIsOpen(!isOpen);
  };

  if (hideRoot) {
    return <li {...stylex.props(styles.container)}>{renderedChildren}</li>;
  }

  return (
    <Collapsible.Root
      {...stylex.props(styles.container)}
      open={isOpen}
      render={<li />}
    >
      <div {...stylex.props(styles.labelContainer)}>
        <JsonArrow
          isOpen={isOpen}
          onClick={handleArrowClick}
          variant={
            highlighting === 'partial-blue'
              ? 'blue'
              : highlighting === 'red'
                ? highlighting
                : undefined
          }
        />

        <JsonNodeLabel
          label={label}
          Icon={Icon}
          highlighting={highlighting === 'red' ? highlighting : undefined}
        />

        {renderElementsCount && (
          <span
            {...stylex.props(
              styles.elementsCount,
              highlighting === 'red' && styles.elementsCountRed,
            )}
          >
            {renderElementsCount(elements.length)}
          </span>
        )}
      </div>

      <Collapsible.Panel {...stylex.props(styles.panel)}>
        {renderedChildren}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
};

const styles = stylex.create({
  container: {
    display: 'grid',
    listStyleType: 'none',
  },
  labelContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
  },
  elementsCount: {
    color: fontColor['--t-font-color-tertiary'],
  },
  elementsCountRed: {
    color: fontColor['--t-font-color-danger'],
  },
  // Base UI sets --collapsible-panel-height to a pixel value during
  // open/close transitions and back to auto once fully open
  panel: {
    height: {
      default: 'var(--collapsible-panel-height)',
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    opacity: {
      default: null,
      ':is([data-starting-style])': 0,
      ':is([data-ending-style])': 0,
    },
    overflow: 'clip',
    transitionDuration: '0.3s',
    transitionProperty: 'height, opacity',
    transitionTimingFunction: 'ease',
  },
  list: {
    display: 'grid',
    margin: 0,
    paddingBlock: 0,
    paddingInline: 0,
    rowGap: spacing['--t-spacing-2'],
  },
  nested: {
    paddingBlockStart: spacing['--t-spacing-2'],
    paddingInlineStart: spacing['--t-spacing-8'],
  },
});
