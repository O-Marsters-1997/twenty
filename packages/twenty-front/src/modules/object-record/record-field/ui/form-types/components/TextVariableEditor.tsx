import { mergeClassName } from '@/page-layout/utils/mergeClassName';
import * as stylex from '@stylexjs/stylex';
import { EditorContent, type Editor } from '@tiptap/react';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import '~/third-party-styles/text-variable-editor.css';

const styles = stylex.create({
  editor: {
    boxSizing: 'border-box',
    display: 'flex',
    height: '100%',
    paddingRight: 0,
    width: '100%',
  },
  editorMultiline: {
    paddingRight: spacing['--t-spacing-8'],
  },
});

type TextVariableEditorProps = {
  multiline: boolean | undefined;
  readonly: boolean | undefined;
  editor: Editor;
};

export const TextVariableEditor = ({
  multiline,
  readonly,
  editor,
}: TextVariableEditorProps) => {
  return (
    <div
      {...mergeClassName(
        stylex.props(styles.editor, multiline && styles.editorMultiline),
        'text-variable-editor',
      )}
      data-multiline={multiline ? '' : undefined}
      data-readonly={readonly ? '' : undefined}
    >
      <EditorContent className="editor-content" editor={editor} />
    </div>
  );
};
