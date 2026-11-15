import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { isDefined } from 'twenty-shared/utils';

import { HtmlNodeInlineEditor } from '@/advanced-text-editor/extensions/blocks/HtmlNodeInlineEditor';
import { sanitizeHtmlPreview } from '@/advanced-text-editor/utils/sanitizeHtmlPreview';
import * as stylex from '@stylexjs/stylex';
import { borderColor, borderRadius } from 'twenty-ui/theme/tokens.stylex';

type HtmlNodeViewProps = Pick<
  NodeViewProps,
  'node' | 'editor' | 'extension' | 'updateAttributes'
>;

const styles = stylex.create({
  preview: {
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    outline: '1px dashed transparent',
    outlineOffset: '2px',
    outlineColor: { default: null, ':hover': borderColor['--t-border-color-medium'] },
  },
});

export const HtmlNodeView = ({
  node,
  editor,
  extension,
  updateAttributes,
}: HtmlNodeViewProps) => {
  const html = typeof node.attrs.html === 'string' ? node.attrs.html : '';

  if (extension.options.isInlineEditable === true && editor.isEditable) {
    return (
      <NodeViewWrapper>
        <HtmlNodeInlineEditor
          html={html}
          onChange={(value) => updateAttributes({ html: value })}
          onFocus={(htmlEditor) => {
            if (isDefined(editor.storage.html)) {
              editor.storage.html.focusedHtmlEditor = htmlEditor;
            }
          }}
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: sanitizeHtmlPreview(html) }} {...stylex.props(styles.preview)}
      />
    </NodeViewWrapper>
  );
};
