import { type BLOCK_SCHEMA } from '@/blocknote-editor/blocks/Schema';
import { CustomAddBlockItem } from '@/blocknote-editor/components/CustomAddBlockItem';
import { CustomSideMenuOptions } from '@/blocknote-editor/components/CustomSideMenuOptions';
import {
  BlockColorsItem,
  DragHandleButton,
  DragHandleMenu,
  RemoveBlockItem,
  SideMenu,
  SideMenuController,
} from '@blocknote/react';
import { useLingui } from '@lingui/react/macro';
import { IconColorSwatch, IconPlus, IconTrash } from 'twenty-ui/icon';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

type CustomSideMenuProps = {
  editor: typeof BLOCK_SCHEMA.BlockNoteEditor;
};

const styles = stylex.create({
  divToCreateGap: {
    width: spacing['--t-spacing-2'],
  },
});

export const CustomSideMenu = ({ editor }: CustomSideMenuProps) => {
  const { t } = useLingui();
  return (
    <SideMenuController
      sideMenu={() => (
        <SideMenu>
          <DragHandleButton
            dragHandleMenu={() => (
              <DragHandleMenu>
                <CustomAddBlockItem editor={editor}>
                  <CustomSideMenuOptions
                    LeftIcon={IconPlus}
                    text={t`Add Block`}
                    Variant="normal"
                  />
                </CustomAddBlockItem>
                <BlockColorsItem>
                  <CustomSideMenuOptions
                    LeftIcon={IconColorSwatch}
                    text={t`Change Color`}
                    Variant="normal"
                  />
                </BlockColorsItem>
                <RemoveBlockItem>
                  <CustomSideMenuOptions
                    LeftIcon={IconTrash}
                    text={t`Delete`}
                    Variant="danger"
                  />
                </RemoveBlockItem>
              </DragHandleMenu>
            )}
          />
          <div {...stylex.props(styles.divToCreateGap)} />
        </SideMenu>
      )}
    />
  );
};
