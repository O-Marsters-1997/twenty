import { JsonNodeLabel } from '@ui/components/data-display/JsonTree/internal/JsonNodeLabel';
import { JsonNodeValue } from '@ui/components/data-display/JsonTree/internal/JsonNodeValue';
import { type JsonNodeHighlighting } from '@ui/components/data-display/JsonTree/types/JsonNodeHighlighting';
import { type IconComponent } from '@ui/icon';
import * as stylex from '@stylexjs/stylex';

import { spacing } from '../../../../theme/tokens.stylex';

type JsonValueNodeProps = {
  valueAsString: string;
  highlighting: JsonNodeHighlighting | undefined;
} & (
  | {
      label: string;
      Icon: IconComponent;
    }
  | {
      label?: never;
      Icon?: unknown;
    }
);

export const JsonValueNode = (props: JsonValueNodeProps) => {
  return (
    <li {...stylex.props(styles.listItem)}>
      {props.label && (
        <JsonNodeLabel
          label={props.label}
          Icon={props.Icon}
          highlighting={props.highlighting}
        />
      )}

      <JsonNodeValue
        valueAsString={props.valueAsString}
        highlighting={props.highlighting}
      />
    </li>
  );
};

const styles = stylex.create({
  listItem: {
    alignItems: 'center',
    columnGap: spacing['--t-spacing-2'],
    display: 'flex',
    listStyleType: 'none',
    whiteSpace: 'nowrap',
  },
});
