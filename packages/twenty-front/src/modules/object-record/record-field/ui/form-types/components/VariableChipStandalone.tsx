import { VariableChip } from '@/object-record/record-field/ui/form-types/components/VariableChip';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    alignItems: 'center',
    display: 'flex',
    marginLeft: spacing['--t-spacing-2'],
  },
});

type VariableChipStandaloneProps = {
  rawVariableName: string;
  onRemove?: () => void;
  isFullRecord?: boolean;
};

export const VariableChipStandalone = ({
  rawVariableName,
  onRemove,
  isFullRecord,
}: VariableChipStandaloneProps) => {
  return (
    <div {...stylex.props(styles.container)}>
      <VariableChip
        rawVariableName={rawVariableName}
        onRemove={onRemove}
        isFullRecord={isFullRecord}
      />
    </div>
  );
};
