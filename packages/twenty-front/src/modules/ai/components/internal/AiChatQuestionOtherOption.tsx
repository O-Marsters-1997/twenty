import { useLingui } from '@lingui/react/macro';
import { type KeyboardEvent, useId, useRef } from 'react';
import { type IconComponent } from 'twenty-ui/icon';
import { useTheme, themeCssVariables } from 'twenty-ui/theme';

import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    borderRadius: borderRadius['--t-border-radius-sm'],
    paddingBlock: `0 ${spacing['--t-spacing-1']}`,
    paddingInline: spacing['--t-spacing-1'],
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    boxSizing: 'border-box',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
  },
  containerHighlighted: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  labelRow: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    height: '32px',
  },
  label: {
    color: fontColor['--t-font-color-secondary'],
    fontSize: fontSize['--t-font-size-md'],
    lineHeight: '1.4',
  },
  textArea: {
    background: background['--t-background-primary'],
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus': borderColor['--t-border-color-blue'],
    },
    borderStyle: 'solid',
    borderWidth: '1px',
    outline: 'none',
    boxSizing: 'border-box',
    color: {
      default: fontColor['--t-font-color-primary'],
      '::placeholder': fontColor['--t-font-color-light'],
    },
    fontFamily: 'inherit',
    fontSize: fontSize['--t-font-size-md'],
    fontWeight: {
      default: null,
      '::placeholder': fontWeight['--t-font-weight-medium'],
    },
    lineHeight: '1.4',
    resize: 'none',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    minHeight: '24px',
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-1'],
    width: '100%',
  },
});

type AiChatQuestionOtherOptionProps = {
  NumberIcon: IconComponent;
  isHighlighted: boolean;
  value: string;
  onChange: (value: string) => void;
  onSelect: () => void;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
};

export const AiChatQuestionOtherOption = ({
  NumberIcon,
  isHighlighted,
  value,
  onChange,
  onSelect,
  onTextareaKeyDown,
}: AiChatQuestionOtherOptionProps) => {
  const { t } = useLingui();
  const theme = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textAreaFocusId = useId();

  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();

  const selectAndFocus = () => {
    onSelect();
    textareaRef.current?.focus();
  };

  const handleTextareaFocus = () => {
    pushFocusItemToFocusStack({
      focusId: textAreaFocusId,
      component: {
        type: FocusComponentType.TEXT_AREA,
        instanceId: textAreaFocusId,
      },
      globalHotkeysConfig: {
        enableGlobalHotkeysConflictingWithKeyboard: false,
      },
    });
  };

  const handleTextareaBlur = () => {
    removeFocusItemFromFocusStackById({ focusId: textAreaFocusId });
  };

  return (
    <div
      {...stylex.props(
        styles.container,
        isHighlighted && styles.containerHighlighted,
      )}
      onClick={selectAndFocus}
    >
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isHighlighted}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectAndFocus();
          }
        }}
        {...stylex.props(styles.labelRow)}
      >
        <NumberIcon
          size={theme.icon.size.sm}
          color={themeCssVariables.font.color.tertiary}
        />
        <span {...stylex.props(styles.label)}>{t`Other`}</span>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        placeholder={t`Type your own answer here`}
        rows={1}
        onClick={(event) => {
          event.stopPropagation();
          if (!isHighlighted) {
            onSelect();
          }
        }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onTextareaKeyDown}
        onFocus={handleTextareaFocus}
        onBlur={handleTextareaBlur}
        {...stylex.props(styles.textArea)}
      />
    </div>
  );
};
