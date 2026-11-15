import { useJsonTreeContextOrThrow } from '@ui/components/data-display/JsonTree/internal/hooks/useJsonTreeContextOrThrow';
import { type JsonNodeHighlighting } from '@ui/components/data-display/JsonTree/types/JsonNodeHighlighting';
import { isDefined } from '@ui/utilities/utils/isDefined';
import * as stylex from '@stylexjs/stylex';

import { focusStyles } from '../../../../styles/focus.stylex';
import { color, fontColor } from '../../../../theme/tokens.stylex';

export const JsonNodeValue = ({
  valueAsString,
  highlighting,
}: {
  valueAsString: string;
  highlighting?: JsonNodeHighlighting | undefined;
}) => {
  const { onNodeValueClick } = useJsonTreeContextOrThrow();

  const isInteractive = isDefined(onNodeValueClick);

  const handleClick = () => {
    onNodeValueClick?.(valueAsString);
  };

  const valueStyles = [
    styles.text,
    highlighting === 'blue' && styles.blue,
    highlighting === 'red' && styles.red,
  ];

  if (isInteractive) {
    return (
      <button
        {...stylex.props(focusStyles.ring, valueStyles, styles.button)}
        type="button"
        onClick={handleClick}
      >
        {valueAsString}
      </button>
    );
  }

  return <span {...stylex.props(valueStyles)}>{valueAsString}</span>;
};

const styles = stylex.create({
  text: {
    alignItems: 'center',
    boxSizing: 'border-box',
    color: fontColor['--t-font-color-tertiary'],
    display: 'inline-flex',
    height: 24,
    lineHeight: 1,
  },
  blue: {
    color: color['--t-color-blue8'],
  },
  red: {
    color: color['--t-color-red8'],
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    cursor: {
      default: 'pointer',
      ':disabled': 'inherit',
    },
    font: 'inherit',
    lineHeight: 1,
    margin: 0,
    padding: 0,
    textAlign: 'inherit',
  },
});
