import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useGetSecondaryFieldButton } from '@/object-record/record-field/ui/hooks/useGetSecondaryFieldButton';
import { useIsFieldEmpty } from '@/object-record/record-field/ui/hooks/useIsFieldEmpty';
import { useIsFieldInputOnly } from '@/object-record/record-field/ui/hooks/useIsFieldInputOnly';
import { useRecordInlineCellContext } from '@/object-record/record-inline-cell/components/RecordInlineCellContext';
import { RecordInlineCellButton } from '@/object-record/record-inline-cell/components/RecordInlineCellEditButton';
import { useLingui } from '@lingui/react/macro';
import { useContext } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  normalModeOuterContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius['--t-border-radius-md'],
    cursor: 'default',
    display: 'flex',
    height: 'auto',
    minHeight: '16px',
    outlineColor: 'transparent',
    outlineStyle: 'solid',
    outlineWidth: '1px',
    overflow: 'hidden',
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
  },
  normalModeOuterContainerHovered: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
    cursor: 'pointer',
  },
  normalModeOuterContainerHoveredReadonly: {
    outlineColor: borderColor['--t-border-color-medium'],
  },
  recordInlineCellNormalModeInnerContainer: {
    alignContent: 'center',
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    height: 'fit-content',
    overflow: 'hidden',
    paddingBottom: '2px',
    paddingTop: '2px',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  emptyField: {
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    height: '20px',
  },
});

export const RecordInlineCellDisplayMode = ({
  children,
  onClick,
  isHovered,
}: React.PropsWithChildren<{
  isHovered: boolean;
  onClick?: () => void;
}>) => {
  const { t } = useLingui();

  const { editModeContentOnly, label, buttonIcon, readonly } =
    useRecordInlineCellContext();

  const { isForbidden } = useContext(FieldContext);

  const isFieldEmpty = useIsFieldEmpty();
  const showEditButton =
    buttonIcon &&
    isHovered &&
    !readonly &&
    !isFieldEmpty &&
    !editModeContentOnly;

  const secondaryButtons = useGetSecondaryFieldButton();

  const showSecondaryButtons =
    isHovered && !isFieldEmpty && !editModeContentOnly && !isForbidden;

  const isFieldInputOnly = useIsFieldInputOnly();

  const emptyPlaceHolder = label ?? t`Empty`;

  const shouldShowValue = !isFieldEmpty || isFieldInputOnly || isForbidden;

  const shouldShowEmptyPlaceholder = isFieldEmpty && !isForbidden;

  return (
    <>
      <div
        onClick={onClick}
        {...stylex.props(
          styles.normalModeOuterContainer,
          isHovered && !readonly && styles.normalModeOuterContainerHovered,
          isHovered &&
            readonly &&
            styles.normalModeOuterContainerHoveredReadonly,
        )}
      >
        <div {...stylex.props(styles.recordInlineCellNormalModeInnerContainer)}>
          {shouldShowValue ? (
            children
          ) : shouldShowEmptyPlaceholder ? (
            <div {...stylex.props(styles.emptyField)}>{emptyPlaceHolder}</div>
          ) : null}
        </div>
      </div>
      {showSecondaryButtons &&
        secondaryButtons.map((button) => (
          <RecordInlineCellButton
            key={button.ariaLabel}
            Icon={button.Icon}
            onClick={button.onClick}
            ariaLabel={button.ariaLabel}
          />
        ))}
      {showEditButton && (
        <RecordInlineCellButton Icon={buttonIcon} onClick={onClick} />
      )}
    </>
  );
};
