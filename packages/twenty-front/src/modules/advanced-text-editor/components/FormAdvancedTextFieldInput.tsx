import { AdvancedTextEditor } from '@/advanced-text-editor/components/AdvancedTextEditor';
import { useAdvancedTextEditor } from '@/advanced-text-editor/hooks/useAdvancedTextEditor';
import { type AdvancedTextEditorComponentProps } from '@/advanced-text-editor/types/AdvancedTextEditorComponentProps';
import { type AdvancedTextEditorProfile } from '@/advanced-text-editor/types/AdvancedTextEditorProfile';
import { type UploadedImage } from '@/advanced-text-editor/types/UploadedImage';
import { serializeAdvancedTextEditorDocument } from '@/advanced-text-editor/utils/serializeAdvancedTextEditorDocument';
import { FormFieldInputContainer } from '@/ui/input/components/FormFieldInputContainer';
import { type VariablePickerComponent } from '@/ui/input/types/VariablePickerComponent';
import { useFullScreenModal } from '@/ui/layout/fullscreen/hooks/useFullScreenModal';
import { type BreadcrumbProps } from '@/ui/navigation/bread-crumb/types/BreadcrumbProps';
import { usePushFocusItemToFocusStack } from '@/ui/utilities/focus/hooks/usePushFocusItemToFocusStack';
import { useRemoveFocusItemFromFocusStackById } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackById';
import { useRemoveFocusItemFromFocusStackOnUnmount } from '@/ui/utilities/focus/hooks/useRemoveFocusItemFromFocusStackOnUnmount';
import { FocusComponentType } from '@/ui/utilities/focus/types/FocusComponentType';
import { useLingui } from '@lingui/react/macro';
import { type Editor } from '@tiptap/core';
import { type ComponentType, useEffect, useId, useState } from 'react';
import { isDefined } from 'twenty-shared/utils';
import { LightIconButton } from 'twenty-ui/components/input';
import { IconMaximize } from 'twenty-ui/icon';
import { Field } from 'twenty-ui/primitives/input';
import { useIsMobile } from 'twenty-ui/utilities';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  backgroundTransparent,
  borderColor,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  containerWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minHeight: 0,
  },
  containerWrapperWithFieldChrome: {
    flexGrow: 0,
    minHeight: 'auto',
  },
  innerContainer: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    boxSizing: 'border-box',
    display: 'flex',
    flexGrow: 1,
    overflow: 'auto',
    width: '100%',
  },
  innerContainerWithFieldChrome: {
    backgroundColor: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
  },
  actionButtonContainer: {
    marginTop: spacing['--t-spacing-1'],
    position: 'absolute',
    right: spacing['--t-spacing-1'],
    top: spacing['--t-spacing-0'],
    zIndex: 1,
  },
  actionButtonContainerWithVariablePicker: {
    right: `calc(${spacing['--t-spacing-7']} + ${spacing['--t-spacing-2']})`,
  },
  advancedTextFieldFieldContainer: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: '1',
    gap: spacing['--t-spacing-2'],
    position: 'relative',
  },
  fullScreenEditorContainer: {
    backgroundColor: background['--t-background-secondary'],
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-medium'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    flex: '1',
    minHeight: '0',
    overflowY: 'auto',
    paddingTop: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
  },
});

const FIELD_EDITOR_STRETCH_STYLE = { flexGrow: 0, minHeight: 'auto' } as const;
const DOCUMENT_EDITOR_STRETCH_STYLE = { flexGrow: 1, minHeight: 0 } as const;

type FormAdvancedTextFieldInputProps = {
  label?: string;
  error?: string;
  hint?: string;
  defaultValue: string | undefined | null;
  onChange?: (value: string) => void;
  readonly?: boolean;
  placeholder?: string;
  VariablePicker?: VariablePickerComponent;
  onImageUpload?: (file: File) => Promise<UploadedImage>;
  onImageUploadError?: (error: Error, file: File) => void;
  profile: AdvancedTextEditorProfile;
  EditorComponent?: ComponentType<AdvancedTextEditorComponentProps>;
  minHeight?: number;
  enableFullScreen?: boolean;
  fullScreenBreadcrumbs?: BreadcrumbProps['links'];
  onEditorReady?: (editor: Editor | null) => void;
};

export const FormAdvancedTextFieldInput = ({
  label,
  error,
  hint,
  defaultValue,
  placeholder,
  onChange,
  readonly,
  VariablePicker,
  onImageUpload,
  onImageUploadError,
  profile,
  EditorComponent = AdvancedTextEditor,
  minHeight,
  enableFullScreen,
  fullScreenBreadcrumbs,
  onEditorReady,
}: FormAdvancedTextFieldInputProps) => {
  const { chrome, minHeight: profileMinHeight } = profile;

  const hasFieldChrome = chrome === 'field';
  const editorMinHeight = minHeight ?? profileMinHeight;
  const isFullScreenEnabled = enableFullScreen ?? profile.enableFullScreen;

  const instanceId = useId();
  const isMobile = useIsMobile();
  const [isFullScreen, setIsFullScreen] = useState(false);

  const { t } = useLingui();
  const { pushFocusItemToFocusStack } = usePushFocusItemToFocusStack();
  const { removeFocusItemFromFocusStackById } =
    useRemoveFocusItemFromFocusStackById();
  useRemoveFocusItemFromFocusStackOnUnmount({
    focusId: instanceId,
    isEnabled: true,
  });

  const editor = useAdvancedTextEditor({
    profile,
    placeholder: placeholder,
    readonly,
    defaultValue,
    onUpdate: (editor) => {
      onChange?.(serializeAdvancedTextEditorDocument(editor));
    },
    onFocus: () => {
      pushFocusItemToFocusStack({
        focusId: instanceId,
        component: {
          type: FocusComponentType.FORM_FIELD_INPUT,
          instanceId: instanceId,
        },
        globalHotkeysConfig: {
          enableGlobalHotkeysConflictingWithKeyboard: false,
        },
      });
    },
    onBlur: () => {
      removeFocusItemFromFocusStackById({ focusId: instanceId });
    },
    onImageUpload,
    onImageUploadError,
  });

  useEffect(() => {
    onEditorReady?.(editor);

    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  const handleEnterFullScreen = () => {
    setIsFullScreen(true);
  };

  const handleExitFullScreen = () => {
    setIsFullScreen(false);
  };

  const handleVariableTagInsert = (variableName: string) => {
    if (!isDefined(editor)) {
      throw new Error(
        'Expected the editor to be defined when a variable is selected',
      );
    }

    const focusedHtmlEditor = editor.storage.html?.focusedHtmlEditor;

    const variableTargetEditor =
      isDefined(focusedHtmlEditor) && !focusedHtmlEditor.isDestroyed
        ? focusedHtmlEditor
        : editor;

    variableTargetEditor.chain().focus().insertVariableTag(variableName).run();
  };

  const defaultBreadcrumbs: BreadcrumbProps['links'] = [
    {
      children: t`Text Editor`,
    },
  ];

  const breadcrumbLinks = fullScreenBreadcrumbs || defaultBreadcrumbs;

  const { renderFullScreenModal } = useFullScreenModal({
    links: breadcrumbLinks,
    onClose: handleExitFullScreen,
    hasClosePageButton: !isMobile,
  });

  if (!isDefined(editor)) {
    return null;
  }

  const fullScreenOverlay = isFullScreenEnabled
    ? renderFullScreenModal(
        <div data-globally-prevent-click-outside="true">
          <div {...stylex.props(styles.fullScreenEditorContainer)}>
            <EditorComponent
              editor={editor}
              readonly={readonly}
              minHeight={editorMinHeight}
            />
          </div>
        </div>,
        isFullScreen,
      )
    : null;

  return (
    <>
      <div
        {...stylex.props(
          styles.containerWrapper,
          hasFieldChrome && styles.containerWrapperWithFieldChrome,
        )}
      >
        <FormFieldInputContainer
          style={
            hasFieldChrome
              ? FIELD_EDITOR_STRETCH_STYLE
              : DOCUMENT_EDITOR_STRETCH_STYLE
          }
        >
          {label ? <Field.Label>{label}</Field.Label> : null}

          <div {...stylex.props(styles.advancedTextFieldFieldContainer)}>
            <div
              {...stylex.props(
                styles.innerContainer,
                hasFieldChrome && styles.innerContainerWithFieldChrome,
              )}
            >
              {!isFullScreen && (
                <EditorComponent
                  editor={editor}
                  readonly={readonly}
                  minHeight={editorMinHeight}
                />
              )}

              {isFullScreenEnabled && (
                <div
                  {...stylex.props(
                    styles.actionButtonContainer,
                    isDefined(VariablePicker) &&
                      !readonly &&
                      styles.actionButtonContainerWithVariablePicker,
                  )}
                >
                  {!readonly && !isFullScreen && (
                    <LightIconButton
                      size="sm"
                      onClick={handleEnterFullScreen}
                      emphasis="subtle"
                      aria-label={t`Expand to full screen`}
                    >
                      <IconMaximize />
                    </LightIconButton>
                  )}
                </div>
              )}

              {VariablePicker && !readonly ? (
                <VariablePicker
                  instanceId={instanceId}
                  multiline={true}
                  onVariableSelect={handleVariableTagInsert}
                />
              ) : null}
            </div>
          </div>
          {hint && <Field.Description>{hint}</Field.Description>}
          {error && <Field.Error match>{error}</Field.Error>}
        </FormFieldInputContainer>
      </div>

      {fullScreenOverlay}
    </>
  );
};
