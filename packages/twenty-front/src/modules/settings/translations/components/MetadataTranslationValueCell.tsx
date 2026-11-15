import { type MetadataTranslationRow } from '@/settings/translations/hooks/useMetadataTranslations';
import { TextInput } from '@/ui/input/components/TextInput';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { fontColor } from 'twenty-ui/theme/tokens.stylex';
import { MetadataTranslationProvenance } from '~/generated-metadata/graphql';

const styles = stylex.create({
  value: {
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  },
  valueInherited: {
    color: fontColor['--t-font-color-light'],
  },
});

type MetadataTranslationValueCellProps = {
  row: MetadataTranslationRow;
  onSave: (value: string | null) => Promise<void>;
  disabled?: boolean;
};

export const MetadataTranslationValueCell = ({
  row,
  onSave,
  disabled = false,
}: MetadataTranslationValueCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const isInherited =
    row.provenance === MetadataTranslationProvenance.INHERITED;

  if (!isEditing) {
    return (
      <div
        {...stylex.props(styles.value, isInherited && styles.valueInherited)}
        onClick={() => {
          if (disabled) {
            return;
          }
          setDraftValue(isInherited ? '' : row.value);
          setIsEditing(true);
        }}
      >
        {row.value}
      </div>
    );
  }

  return (
    <TextInput
      sizeVariant="sm"
      fullWidth
      autoFocus
      value={draftValue}
      onChange={setDraftValue}
      onBlur={async () => {
        setIsEditing(false);

        const value = draftValue.trim() === '' ? null : draftValue;

        if (value === row.value || (!isDefined(value) && isInherited)) {
          return;
        }

        await onSave(value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
        if (event.key === 'Escape') {
          setIsEditing(false);
        }
      }}
    />
  );
};
