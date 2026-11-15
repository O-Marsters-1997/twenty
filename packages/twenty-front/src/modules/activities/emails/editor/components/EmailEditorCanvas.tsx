import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';
import { AdvancedTextEditor } from '@/advanced-text-editor/components/AdvancedTextEditor';
import { AdvancedTextEditorBlockHandle } from '@/advanced-text-editor/components/AdvancedTextEditorBlockHandle';
import { useOpenEmailBlockStyleInSidePanel } from '@/side-panel/hooks/useOpenEmailBlockStyleInSidePanel';
import { useLiveEditorState } from '@/advanced-text-editor/hooks/useLiveEditorState';
import { type AdvancedTextEditorComponentProps } from '@/advanced-text-editor/types/AdvancedTextEditorComponentProps';
import { styled } from '@linaria/react';
import { type MouseEvent } from 'react';
import { CANVAS_THEME_DEFAULTS, resolveCanvasTheme } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme';

const styles = stylex.create({
  canvasBackdrop: {
    boxSizing: 'border-box',
    flexGrow: 1,
    minHeight: '100%',
    paddingBlock: spacing['--t-spacing-8'],
    paddingInline: spacing['--t-spacing-4'],
    width: '100%',
  },
});

const StyledCanvasPage = styled.div`
  box-sizing: border-box;
  margin: 0 auto;
  max-width: 100%;
  min-height: 400px;

  .editor-content,
  .tiptap {
    min-height: inherit;
  }

  .tiptap {
    color: inherit;
    margin-left: calc(-1 * ${themeCssVariables.spacing[10]});
    padding: 0 0 0 ${themeCssVariables.spacing[10]};
    width: calc(100% + ${themeCssVariables.spacing[10]});
  }
`;

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
      <StyledCanvasPage
        onClick={handleCanvasClick}
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
      </StyledCanvasPage>
    </div>
  );
};
