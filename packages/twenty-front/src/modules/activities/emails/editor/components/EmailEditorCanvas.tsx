import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { AdvancedTextEditor } from '@/advanced-text-editor/components/AdvancedTextEditor';
import { AdvancedTextEditorBlockHandle } from '@/advanced-text-editor/components/AdvancedTextEditorBlockHandle';
import { useOpenEmailBlockStyleInSidePanel } from '@/side-panel/hooks/useOpenEmailBlockStyleInSidePanel';
import { useLiveEditorState } from '@/advanced-text-editor/hooks/useLiveEditorState';
import { type AdvancedTextEditorComponentProps } from '@/advanced-text-editor/types/AdvancedTextEditorComponentProps';
import { type MouseEvent } from 'react';
import { CANVAS_THEME_DEFAULTS, resolveCanvasTheme } from 'twenty-shared/utils';
import '~/third-party-styles/email-editor-canvas.css';

const styles = stylex.create({
  canvasBackdrop: {
    paddingBlock: spacing['--t-spacing-8'],
    paddingInline: spacing['--t-spacing-4'],
    boxSizing: 'border-box',
    flexGrow: 1,
    minHeight: '100%',
    width: '100%',
  },
  canvasPage: {
    marginBlock: 0,
    marginInline: 'auto',
    boxSizing: 'border-box',
    maxWidth: '100%',
    minHeight: '400px',
  },
});

type EmailEditorCanvasProps = AdvancedTextEditorComponentProps;

export const EmailEditorCanvas = ({
  editor,
  readonly,
  minHeight,
}: EmailEditorCanvasProps) => {
  const storedCanvasTheme = useLiveEditorState(editor, (currentEditor) =>
    resolveCanvasTheme(currentEditor.state.doc.attrs.canvasTheme),
  );
  const canvasTheme = storedCanvasTheme ?? CANVAS_THEME_DEFAULTS;
  const {
    openEmailBlockStyleInSidePanel,
    followEmailBlockSelectionInSidePanel,
  } = useOpenEmailBlockStyleInSidePanel();

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Node &&
      editor.view.dom.contains(event.target)
    ) {
      followEmailBlockSelectionInSidePanel(editor);
    }
  };

  return (
    <div
      {...stylex.props(styles.canvasBackdrop)}
      style={{
        backgroundColor: canvasTheme.pageBackground,
        padding: canvasTheme.pagePadding,
      }}
    >
      <div
        data-email-editor-canvas-page
        onClick={handleCanvasClick}
        {...stylex.props(styles.canvasPage)}
        style={{
          backgroundColor: canvasTheme.bodyBackground || undefined,
          border:
            canvasTheme.borderWidth !== '' && canvasTheme.borderWidth !== '0px'
              ? `${canvasTheme.borderWidth} solid ${canvasTheme.borderColor}`
              : undefined,
          borderRadius: canvasTheme.cornerRadius,
          color: canvasTheme.textColor,
          padding: canvasTheme.padding,
          textAlign: canvasTheme.textAlign,
          width: canvasTheme.width,
        }}
      >
        <AdvancedTextEditor
          editor={editor}
          readonly={readonly}
          minHeight={minHeight}
        />
        <AdvancedTextEditorBlockHandle
          editor={editor}
          onOpenBlockSettings={openEmailBlockStyleInSidePanel}
        />
      </div>
    </div>
  );
};
