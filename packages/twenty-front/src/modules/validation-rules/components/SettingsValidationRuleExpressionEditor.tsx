import { useLingui } from '@lingui/react/macro';
import { type JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder } from '@tiptap/extensions/placeholder';
import { UndoRedo } from '@tiptap/extensions/undo-redo';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import { useState } from 'react';
import { type ValidationRuleFieldDescriptor } from 'twenty-shared/types';
import {
  compileValidationRuleExpression,
  isDefined,
} from 'twenty-shared/utils';
import { Field } from 'twenty-ui/primitives/input';
import { Card } from 'twenty-ui/primitives/surfaces';

import { SettingsValidationRuleAskAiButton } from '@/validation-rules/components/SettingsValidationRuleAskAiButton';
import { SettingsValidationRuleHelperPanel } from '@/validation-rules/components/SettingsValidationRuleHelperPanel';
import { ValidationRuleExpressionExtension } from '@/validation-rules/extensions/ValidationRuleExpressionExtension';
import { ValidationRuleFieldNode } from '@/validation-rules/extensions/ValidationRuleFieldNode';
import { type ValidationRuleEditorField } from '@/validation-rules/types/ValidationRuleEditorField';
import { type ValidationRuleFieldNodeAttributes } from '@/validation-rules/types/ValidationRuleFieldNodeAttributes';
import { type ValidationRuleHelperContext } from '@/validation-rules/types/ValidationRuleHelperContext';
import { type ValidationRuleHelperItem } from '@/validation-rules/types/ValidationRuleHelperItem';
import { buildValidationRuleEditorParagraphContent } from '@/validation-rules/utils/buildValidationRuleEditorParagraphContent';
import { computeValidationRuleEditorSegments } from '@/validation-rules/utils/computeValidationRuleEditorSegments';
import { computeValidationRuleHelperContext } from '@/validation-rules/utils/computeValidationRuleHelperContext';
import { computeValidationRuleHelperContextAtCursor } from '@/validation-rules/utils/computeValidationRuleHelperContextAtCursor';
import { getValidationRuleEditorFieldChipLabel } from '@/validation-rules/utils/getValidationRuleEditorFieldChipLabel';
import { getValidationRuleEditorText } from '@/validation-rules/utils/getValidationRuleEditorText';
import { handleValidationRuleEditorPaste } from '@/validation-rules/utils/handleValidationRuleEditorPaste';
import { insertValidationRuleHelperItem } from '@/validation-rules/utils/insertValidationRuleHelperItem';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
  codeFont,
  color,
  fontColor,
  fontSize,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const SingleParagraphDocument = Document.extend({ content: 'paragraph' });

const styles = stylex.create({
  editorContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  editor: {
    background: backgroundTransparent['--t-background-transparent-lighter'],
    borderColor: {
      default: borderColor['--t-border-color-medium'],
      ':focus-within': color['--t-color-blue'],
    },
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'solid',
    borderWidth: '1px',
    color: fontColor['--t-font-color-primary'],
    fontFamily: codeFont['--t-code-font-family'],
    fontSize: fontSize['--t-font-size-md'],
    position: 'relative',
  },
  editorError: {
    borderColor: {
      default: borderColor['--t-border-color-danger'],
      ':focus-within': color['--t-color-blue'],
    },
  },
  askAiButtonContainer: {
    position: 'absolute',
    right: spacing['--t-spacing-1'],
    top: spacing['--t-spacing-1'],
  },
});

type SettingsValidationRuleExpressionEditorProps = {
  value: string;
  fields: ValidationRuleFieldDescriptor[];
  editorFields: ValidationRuleEditorField[];
  onChange: (expression: string) => void;
};

export const SettingsValidationRuleExpressionEditor = ({
  value,
  fields,
  editorFields,
  onChange,
}: SettingsValidationRuleExpressionEditorProps) => {
  const { t } = useLingui();

  const [helperContext, setHelperContext] =
    useState<ValidationRuleHelperContext>(() =>
      computeValidationRuleHelperContext({
        textBeforeCursor: '',
        isCursorAfterField: false,
        fields: editorFields,
      }),
    );
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isHelperFocused, setIsHelperFocused] = useState(false);

  const getFieldNodeAttributes = (
    path: string,
  ): ValidationRuleFieldNodeAttributes | null => {
    const field = editorFields.find((candidate) => candidate.path === path);

    return isDefined(field)
      ? {
          path,
          label: getValidationRuleEditorFieldChipLabel(field),
          iconName: field.iconName,
        }
      : null;
  };

  const refreshHelperContext = (editor: Editor) => {
    setHelperContext(
      computeValidationRuleHelperContextAtCursor({
        editor,
        fields: editorFields,
      }),
    );
    setHighlightedIndex(0);
    setIsHelperFocused(false);
  };

  const initialContent: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: buildValidationRuleEditorParagraphContent({
          segments: computeValidationRuleEditorSegments({
            expression: value,
            isFieldPath: (path) => isDefined(getFieldNodeAttributes(path)),
            cursorOffset: null,
            fieldRanges: [],
          }),
          getFieldNodeAttributes,
        }),
      },
    ],
  };

  const editor = useEditor({
    extensions: [
      SingleParagraphDocument,
      Paragraph,
      Text,
      UndoRedo,
      Placeholder.configure({
        placeholder: t`Type a field name or a function`,
      }),
      ValidationRuleFieldNode,
      ValidationRuleExpressionExtension.configure({ getFieldNodeAttributes }),
    ],
    content: initialContent,
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(getValidationRuleEditorText(updatedEditor.state.doc));
      refreshHelperContext(updatedEditor);
    },
    onSelectionUpdate: ({ editor: updatedEditor }) =>
      refreshHelperContext(updatedEditor),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': t`Condition`,
        spellcheck: 'false',
      },
      handleKeyDown: (_view, event) => handleEditorKeyDown(event),
      handlePaste: handleValidationRuleEditorPaste,
    },
    enableInputRules: false,
    enablePasteRules: false,
    injectCSS: false,
  });

  const insertHelperItem = (item: ValidationRuleHelperItem) => {
    if (!isDefined(editor)) {
      return;
    }

    insertValidationRuleHelperItem({
      editor,
      item,
      replaceFromOffset: computeValidationRuleHelperContextAtCursor({
        editor,
        fields: editorFields,
      }).replaceFromOffset,
      getFieldNodeAttributes,
    });
  };

  const handleEditorKeyDown = (event: KeyboardEvent): boolean => {
    const { items } = helperContext;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (items.length === 0) {
        return false;
      }

      const step = event.key === 'ArrowDown' ? 1 : -1;

      if (isHelperFocused) {
        setHighlightedIndex(
          (index) => (index + step + items.length) % items.length,
        );
      } else {
        setHighlightedIndex(step === 1 ? 0 : items.length - 1);
        setIsHelperFocused(true);
      }

      return true;
    }

    if (event.key !== 'Enter') {
      return false;
    }

    const highlightedItem = items[highlightedIndex];

    if (isHelperFocused && isDefined(highlightedItem)) {
      insertHelperItem(highlightedItem);
    }

    return true;
  };

  const compilationResult = compileValidationRuleExpression({
    expression: value,
    fields,
  });
  const errorMessage =
    value.trim().length > 0 && !compilationResult.isValid
      ? compilationResult.errorMessage
      : null;

  return (
    <>
      <Card.Content divider>
        <Field.Root {...stylex.props(styles.editorContent)}>
          <div
            data-validation-rule-editor
            {...stylex.props(
              styles.editor,
              isDefined(errorMessage) && styles.editorError,
            )}
          >
            <EditorContent editor={editor} />
            <div {...stylex.props(styles.askAiButtonContainer)}>
              <SettingsValidationRuleAskAiButton />
            </div>
          </div>
          {isDefined(errorMessage) && (
            <Field.Error match role="alert">
              {errorMessage}
            </Field.Error>
          )}
        </Field.Root>
      </Card.Content>
      <SettingsValidationRuleHelperPanel
        items={helperContext.items}
        highlightedIndex={highlightedIndex}
        isFocused={isHelperFocused}
        editorFields={editorFields}
        onHighlight={setHighlightedIndex}
        onSelect={insertHelperItem}
      />
    </>
  );
};
