import { type FieldMultiSelectValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { isDefined } from 'twenty-shared/utils';
import * as stylex from '@stylexjs/stylex';
import { Tag } from 'twenty-ui/primitives/data-display';
import { type SelectOption } from 'twenty-ui/primitives/input';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    justifyContent: 'flex-start',
    maxWidth: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  tag: {
    minWidth: 'fit-content',
  },
});

export const MultiSelectDisplay = ({
  values,
  options,
  className,
}: {
  values: FieldMultiSelectValue | undefined;
  options: SelectOption[];
  className?: string;
}) => {
  const selectedOptions = values
    ? options?.filter((option) => values.includes(option.value))
    : [];

  if (!isDefined(selectedOptions)) return null;

  const containerProps = stylex.props(styles.container);

  return (
    <div
      {...containerProps}
      className={[containerProps.className, className].filter(isDefined).join(' ')}
    >
      {selectedOptions.map((selectedOption, index) => (
        <Tag
          truncate={false}
          key={index}
          color={selectedOption.color ?? 'transparent'}
          startIcon={
            isDefined(selectedOption.Icon) ? <selectedOption.Icon /> : undefined
          }
          {...stylex.props(styles.tag)}
        >
          {selectedOption.label}
        </Tag>
      ))}
    </div>
  );
};
