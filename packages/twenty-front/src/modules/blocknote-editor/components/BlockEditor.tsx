import {
  filterSuggestionItems,
  SuggestionMenu,
} from '@blocknote/core/extensions';
import { BlockNoteView } from '@blocknote/mantine';
import { SuggestionMenuController } from '@blocknote/react';
import { useLingui } from '@lingui/react/macro';
import * as stylex from '@stylexjs/stylex';
import { type ClipboardEvent } from 'react';
import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { getSlashMenu } from '@/blocknote-editor/utils/getSlashMenu';
import { CustomMentionMenu } from '@/blocknote-editor/components/CustomMentionMenu';
import { CustomSideMenu } from '@/blocknote-editor/components/CustomSideMenu';
import { CustomSlashMenu } from '@/blocknote-editor/components/CustomSlashMenu';
import { type SuggestionItem } from '@/blocknote-editor/types/SuggestionMenuItems';
import { useMentionMenu } from '@/mention/hooks/useMentionMenu';
import { IconX } from 'twenty-ui/icon';
import { useThemeColorScheme } from 'twenty-ui/theme';
import {
  backgroundTransparent,
  borderColor,
  borderRadius,
} from 'twenty-ui/theme/tokens.stylex';
import '~/third-party-styles/blocknote-editor.css';

interface BlockEditorProps {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor;
  onFocus?: () => void;
  onBlur?: () => void;
  onPaste?: (event: ClipboardEvent) => void;
  onChange?: () => void;
  readonly?: boolean;
  isCompact?: boolean;
}

const styles = stylex.create({
  editor: {
    maxWidth: '100%',
    minWidth: 0,
    width: '100%',
  },
  compact: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-md'],
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor:
      backgroundTransparent['--t-background-transparent-lighter'],
    boxSizing: 'border-box',
  },
});

export const BlockEditor = ({
  editor,
  onFocus,
  onBlur,
  onChange,
  onPaste,
  readonly,
  isCompact,
}: BlockEditorProps) => {
  const colorScheme = useThemeColorScheme();
  const { t } = useLingui();

  const blockNoteTheme = colorScheme === 'light' ? 'light' : 'dark';
  const getMentionItems = useMentionMenu(editor);

  const getSlashMenuItems = async (query: string) => {
    const filtered = filterSuggestionItems<SuggestionItem>(
      getSlashMenu(editor),
      query,
    );

    if (filtered.length > 0) {
      return filtered;
    }

    return [
      {
        title: t`Close menu`,
        Icon: IconX,
        onItemClick: () => editor.getExtension(SuggestionMenu)?.closeMenu(),
      },
    ];
  };

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
    <div
      data-block-editor
      data-compact={isCompact}
      {...stylex.props(styles.editor, isCompact && styles.compact)}
    >
      <BlockNoteView
        onFocus={handleFocus}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onChange={handleChange}
        editor={editor}
        theme={blockNoteTheme}
        slashMenu={false}
        sideMenu={false}
        editable={!readonly}
      >
        <CustomSideMenu editor={editor} />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
          suggestionMenuComponent={CustomSlashMenu}
        />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) => getMentionItems(query)}
          suggestionMenuComponent={CustomMentionMenu}
        />
      </BlockNoteView>
    </div>
  );
};
