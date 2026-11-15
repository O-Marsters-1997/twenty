import { filterSuggestionItems } from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController } from '@blocknote/react';
import { type ClipboardEvent } from 'react';

import { CustomSlashMenu } from '@/blocknote-editor/components/CustomSlashMenu';
import { type SuggestionItem } from '@/blocknote-editor/types/SuggestionMenuItems';
import { DashboardEditorSideMenu } from '@/page-layout/widgets/standalone-rich-text/components/DashboardEditorSideMenu';
import { DashboardFormattingToolbar } from '@/page-layout/widgets/standalone-rich-text/components/DashboardFormattingToolbar';
import { type DASHBOARD_BLOCK_SCHEMA } from '@/page-layout/widgets/standalone-rich-text/constants/DashboardBlockSchema';
import { getDashboardSlashMenu } from '@/page-layout/widgets/standalone-rich-text/utils/getDashboardSlashMenu';
import { useThemeColorScheme, themeCssVariables } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
type DashboardsBlockEditorProps = {
  editor: typeof DASHBOARD_BLOCK_SCHEMA.BlockNoteEditor;
  onFocus?: () => void;
  onBlur?: () => void;
  onPaste?: (event: ClipboardEvent) => void;
  onChange?: () => void;
  readonly?: boolean;
};

import '~/third-party-styles/blocknote-dashboard.css';

const styles = stylex.create({
  editor: {
    width: '100%',
  },
});

// TODO: Refactor these BlockNote CSS overrides - some may be dead code now that we have custom components
// (DashboardEditorSideMenu, DashboardColorSelectionMenu).
// Test removing each selector and move necessary styles to appropriate components.
// BlockNote shares this class with its body portal to preserve menu styles outside the widget.
// oxlint-disable-next-line twenty/no-hardcoded-colors

export const DashboardsBlockEditor = ({
  editor,
  onFocus,
  onBlur,
  onChange,
  onPaste,
  readonly,
}: DashboardsBlockEditorProps) => {
  const colorScheme = useThemeColorScheme();
  const blockNoteTheme = colorScheme === 'light' ? 'light' : 'dark';

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    onBlur?.();
  };

  const handleChange = () => {
    onChange?.();
  };

  const handlePaste = (event: ClipboardEvent) => {
    onPaste?.(event);
  };

  return (
    <div {...stylex.props(styles.editor)}>
      <BlockNoteView
        className="dashboard-block-editor"
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onChange={handleChange}
        editor={editor}
        theme={blockNoteTheme}
        slashMenu={false}
        sideMenu={false}
        formattingToolbar={false}
        editable={!readonly}
        portalElements={{ default: null }}
      >
        {!readonly && (
          <>
            <DashboardFormattingToolbar />
            <DashboardEditorSideMenu editor={editor} />
            <SuggestionMenuController
              triggerCharacter="/"
              getItems={async (query) => {
                const items = getDashboardSlashMenu(editor);
                return filterSuggestionItems<SuggestionItem>(items, query);
              }}
              suggestionMenuComponent={CustomSlashMenu}
            />
          </>
        )}
      </BlockNoteView>
    </div>
  );
};
