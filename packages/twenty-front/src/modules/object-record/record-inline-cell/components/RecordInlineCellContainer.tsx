import { FieldDescriptionTooltip } from '@/object-record/record-field/ui/components/FieldDescriptionTooltip';
import { useContext } from 'react';
import { useTheme } from 'twenty-ui/theme';

import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useFieldFocus } from '@/object-record/record-field/ui/hooks/useFieldFocus';
import { RecordInlineCellValue } from '@/object-record/record-inline-cell/components/RecordInlineCellValue';

import { assertFieldMetadata } from '@/object-record/record-field/ui/types/guards/assertFieldMetadata';
import { isFieldText } from '@/object-record/record-field/ui/types/guards/isFieldText';
import { TooltipDelay } from '@/ui/layout/tooltip/constants/TooltipDelay';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { Tooltip } from 'twenty-ui/primitives/surfaces';
import { FieldMetadataType } from '~/generated-metadata/graphql';
import { useRecordInlineCellContext } from './RecordInlineCellContext';
import * as stylex from '@stylexjs/stylex';
import { fontColor, fontSize, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  iconContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    width: '16px',
  },
  labelContainer: {
    color: fontColor['--t-font-color-tertiary'],
    fontSize: fontSize['--t-font-size-sm'],
    width: 'auto',
  },
  labelWidth: (width: number) => ({
    width: `${width}px`,
  }),
  inlineCellBaseContainer: {
    alignItems: 'center',
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: 'fit-content',
    userSelect: 'none',
    width: '100%',
  },
  readonly: {
    cursor: 'default',
  },
  labelAndIconContainer: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    height: '24px',
  },
  valueContainer: {
    display: 'flex',
    minWidth: '0',
    position: 'relative',
    userSelect: 'text',
    width: '100%',
  },
});

export const RecordInlineCellContainer = () => {
  const { readonly, IconLabel, label, labelWidth, showLabel } =
    useRecordInlineCellContext();
  const theme = useTheme();

  const { fieldDefinition, onMouseEnter, onMouseLeave, anchorId } =
    useContext(FieldContext);

  if (isFieldText(fieldDefinition)) {
    assertFieldMetadata(FieldMetadataType.TEXT, isFieldText, fieldDefinition);
  }

  const { setIsFocused } = useFieldFocus();

  const handleContainerMouseEnter = () => {
    if (!readonly) {
      setIsFocused(true);
    }
    onMouseEnter?.();
  };

  const handleContainerMouseLeave = () => {
    if (!readonly) {
      setIsFocused(false);
    }
    onMouseLeave?.();
  };

  return (
    <div
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
      {...stylex.props(
        styles.inlineCellBaseContainer,
        readonly && styles.readonly,
      )}
    >
      {(IconLabel || label) && (
        <Tooltip
          content={label}
          disabled={showLabel}
          side="bottom"
          positionMethod="fixed"
          delay={TooltipDelay.shortDelay}
        >
          <div {...stylex.props(styles.labelAndIconContainer)}>
            {IconLabel && (
              <div {...stylex.props(styles.iconContainer)}>
                <IconLabel size={16} stroke={theme.icon.stroke.sm} />
              </div>
            )}
            {showLabel && (
              <div
                {...stylex.props(
                  styles.labelContainer,
                  labelWidth !== undefined && styles.labelWidth(labelWidth),
                )}
              >
                <FieldDescriptionTooltip
                  label={label}
                  description={fieldDefinition?.metadata?.description}
                  fallback={
                    <OverflowingTextWithTooltip text={label} lineClamp={1} />
                  }
                />
              </div>
            )}
          </div>
        </Tooltip>
      )}
      <div id={anchorId} {...stylex.props(styles.valueContainer)}>
        <RecordInlineCellValue />
      </div>
    </div>
  );
};
