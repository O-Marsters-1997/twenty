import { ImageBubbleMenu } from '@/advanced-text-editor/components/ImageBubbleMenu';
import { LinkBubbleMenu } from '@/advanced-text-editor/components/LinkBubbleMenu';
import { TextBubbleMenu } from '@/advanced-text-editor/components/TextBubbleMenu';
import { type AdvancedTextEditorComponentProps } from '@/advanced-text-editor/types/AdvancedTextEditorComponentProps';
import { hasEditorExtension } from '@/advanced-text-editor/utils/hasEditorExtension';
import * as stylex from '@stylexjs/stylex';
import { EditorContent } from '@tiptap/react';
import '~/third-party-styles/advanced-text-editor.css';

const styles = stylex.create({
  container: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
  },
});

const TEXT_BUBBLE_MENU_EXTENSION_NAMES = [
  'bold',
  'italic',
  'underline',
  'strike',
  'bulletList',
  'orderedList',
  'heading',
  'link',
];

type AdvancedTextEditorProps = AdvancedTextEditorComponentProps;

export const AdvancedTextEditor = ({
  readonly,
  editor,
  minHeight,
}: AdvancedTextEditorProps) => {
  const hasTextBubbleMenu = TEXT_BUBBLE_MENU_EXTENSION_NAMES.some(
    (extensionName) => hasEditorExtension(editor, extensionName),
  );

  return (
    <div
      data-advanced-text-editor
      data-readonly={readonly === true}
      {...stylex.props(styles.container)}
    >
      <EditorContent
        className="editor-content"
        style={{ minHeight }}
        editor={editor}
      />
      {hasEditorExtension(editor, 'image') &&
        !hasEditorExtension(editor, 'section') && (
          <ImageBubbleMenu editor={editor} />
        )}
      {hasTextBubbleMenu && <TextBubbleMenu editor={editor} />}
      {hasEditorExtension(editor, 'link') && <LinkBubbleMenu editor={editor} />}
    </div>
  );
};
