import { useActiveStyles, useBlockNoteEditor } from '@blocknote/react';
import { useLingui } from '@lingui/react/macro';
import { useId } from 'react';
import { Dropdown } from 'twenty-ui/components/navigation';

import { DashboardColorIcon } from '@/page-layout/widgets/standalone-rich-text/components/DashboardColorIcon';
import { DashboardColorSelectionMenu } from '@/page-layout/widgets/standalone-rich-text/components/DashboardColorSelectionMenu';
import { type BlockNoteColor } from '@/page-layout/widgets/standalone-rich-text/types/BlockNoteColor';
import { extractColorFromProps } from '@/page-layout/widgets/standalone-rich-text/utils/extractColorFromProps';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  colorButton: {
    alignItems: 'center',
    background: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderStyle: 'none',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    cursor: 'pointer',
    display: 'flex',
    height: '24px',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    width: '24px',
  },
});

export const DashboardFormattingToolbarColorButton = () => {
  const editor = useBlockNoteEditor();
  const { t } = useLingui();
  const instanceId = useId();
  const activeStyles = useActiveStyles(editor);
  const currentTextColor = extractColorFromProps(activeStyles, 'text');
  const currentBackgroundColor = extractColorFromProps(
    activeStyles,
    'background',
  );

  const handleTextColorSelect = (color: BlockNoteColor) => {
    if (color === 'default') {
      editor.removeStyles({ textColor: color });
      return;
    }
    editor.addStyles({ textColor: color });
  };

  const handleBackgroundColorSelect = (color: BlockNoteColor) => {
    if (color === 'default') {
      editor.removeStyles({ backgroundColor: color });
      return;
    }
    editor.addStyles({ backgroundColor: color });
  };

  return (
    <DropdownRoot dropdownId={`dashboard-color-${instanceId}`} type="picker">
      <Dropdown.Trigger
        render={
          <button
            aria-label={t`Text and background colors`}
            {...stylex.props(styles.colorButton)}
          >
            <DashboardColorIcon
              textColor={currentTextColor}
              backgroundColor={currentBackgroundColor}
            />
          </button>
        }
      />
      <DropdownContent
        sideOffset={8}
        className="bn-ui-container"
        aria-label={t`Text and background colors`}
        finalFocus={() => {
          editor.focus();
          return false;
        }}
      >
        <DashboardColorSelectionMenu
          currentTextColor={currentTextColor}
          currentBackgroundColor={currentBackgroundColor}
          onTextColorSelect={handleTextColorSelect}
          onBackgroundColorSelect={handleBackgroundColorSelect}
        />
      </DropdownContent>
    </DropdownRoot>
  );
};
