import { styled } from '@linaria/react';
import { type Ref } from 'react';
import { createPortal } from 'react-dom';
import { type IconComponent, IconPlus } from 'twenty-ui/icon';
import { themeCssVariables, useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { borderRadius, color } from 'twenty-ui/theme/tokens.stylex';

const StyledDragPreview = styled.div`
  align-items: center;
  backdrop-filter: ${themeCssVariables.blur.strong};
  background-color: ${themeCssVariables.tooltip.background};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.tooltip.color};
  display: inline-flex;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
  gap: ${themeCssVariables.spacing[1]};
  left: -10000px;
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[2]};
  pointer-events: none;
  position: fixed;
  top: 0;
  white-space: nowrap;

  &[data-insertion='true'] {
    padding-left: ${themeCssVariables.spacing[1]};
  }
`;

const styles = stylex.create({
  insertionBadge: {
    alignItems: 'center',
    backgroundColor: color['--t-color-blue'],
    borderTopLeftRadius: borderRadius['--t-border-radius-rounded'],
    borderTopRightRadius: borderRadius['--t-border-radius-rounded'],
    borderBottomRightRadius: borderRadius['--t-border-radius-rounded'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-rounded'],
    display: 'inline-flex',
    height: '16px',
    justifyContent: 'center',
    width: '16px',
  },
});

type AdvancedTextEditorDragPreviewProps = {
  Icon: IconComponent;
  label: string;
  isInsertion?: boolean;
  ref: Ref<HTMLDivElement>;
};

export const AdvancedTextEditorDragPreview = ({
  Icon,
  label,
  isInsertion = false,
  ref,
}: AdvancedTextEditorDragPreviewProps) => {
  const theme = useTheme();

  return createPortal(
    <StyledDragPreview
      ref={ref}
      aria-hidden
      data-insertion={String(isInsertion)}
    >
      {isInsertion && (
        <span {...stylex.props(styles.insertionBadge)}>
          <IconPlus size={10} stroke={theme.icon.stroke.lg} />
        </span>
      )}
      <Icon size={theme.icon.size.sm} stroke={theme.icon.stroke.sm} />
      {label}
    </StyledDragPreview>,
    document.body,
  );
};
