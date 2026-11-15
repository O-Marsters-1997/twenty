import { t } from '@lingui/core/macro';
import { EditorContent, type Editor } from '@tiptap/react';
import { isDefined } from 'twenty-shared/utils';

import { useTextVariableEditor } from '@/object-record/record-field/ui/form-types/hooks/useTextVariableEditor';
import '~/third-party-styles/advanced-text-editor.css';

type HtmlNodeInlineEditorProps = {
  html: string;
  onChange: (html: string) => void;
  onFocus: (htmlEditor: Editor) => void;
};

export const HtmlNodeInlineEditor = ({
  html,
  onChange,
  onFocus,
}: HtmlNodeInlineEditorProps) => {
  const htmlEditor = useTextVariableEditor({
    placeholder: t`Paste or write your HTML here`,
    multiline: true,
    readonly: false,
    defaultValue: html,
    onUpdate: (editor) => onChange(editor.getText()),
  });

  if (!isDefined(htmlEditor)) {
    return null;
  }

  return (
    <div data-html-node-inline-editor onFocus={() => onFocus(htmlEditor)}>
      <EditorContent editor={htmlEditor} />
    </div>
  );
};
