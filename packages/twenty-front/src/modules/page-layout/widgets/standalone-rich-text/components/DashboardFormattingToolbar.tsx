import {
  BasicTextStyleButton,
  BlockTypeSelect,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
} from '@blocknote/react';
import { flip, offset, shift } from '@floating-ui/react';

import { DashboardFormattingToolbarColorButton } from '@/page-layout/widgets/standalone-rich-text/components/DashboardFormattingToolbarColorButton';
import { FORMATTING_TOOLBAR_FLOATING_CONFIG } from '@/page-layout/widgets/standalone-rich-text/constants/FormattingToolbarFloatingConfig';

export const DashboardFormattingToolbar = () => {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <div
          data-dashboard-formatting-toolbar=""
          {...stylex.props(
            styles.toolbarContainer(
              FORMATTING_TOOLBAR_FLOATING_CONFIG.boundaryPadding * 2,
            ),
          )}
        >
          <FormattingToolbar>
            <BlockTypeSelect key="blockTypeSelect" />
            <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
            <BasicTextStyleButton
              basicTextStyle="italic"
              key="italicStyleButton"
            />
            <BasicTextStyleButton
              basicTextStyle="underline"
              key="underlineStyleButton"
            />
            <BasicTextStyleButton
              basicTextStyle="strike"
              key="strikeStyleButton"
            />
            <TextAlignButton textAlignment="left" key="textAlignLeftButton" />
            <TextAlignButton
              textAlignment="center"
              key="textAlignCenterButton"
            />
            <TextAlignButton textAlignment="right" key="textAlignRightButton" />
            <DashboardFormattingToolbarColorButton key="colorStyleButton" />
            <NestBlockButton key="nestBlockButton" />
            <UnnestBlockButton key="unnestBlockButton" />
            <CreateLinkButton key="createLinkButton" />
          </FormattingToolbar>
        </div>
      )}
      floatingUIOptions={{
        useFloatingOptions: {
          middleware: [
            offset(FORMATTING_TOOLBAR_FLOATING_CONFIG.offsetFromSelection),
            shift({
              padding: FORMATTING_TOOLBAR_FLOATING_CONFIG.boundaryPadding,
            }),
            flip(),
          ],
        },
      }}
    />
  );
};

import * as stylex from '@stylexjs/stylex';
import '~/third-party-styles/blocknote-dashboard.css';

const styles = stylex.create({
  toolbarContainer: (inset: number) => ({
    maxWidth: `calc(100vw - ${inset}px)`,
  }),
});
