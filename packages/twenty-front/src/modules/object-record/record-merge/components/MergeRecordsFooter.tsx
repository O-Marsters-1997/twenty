import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { useMergeRecordsActions } from '@/object-record/record-merge/hooks/useMergeRecordsActions';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { Key } from 'ts-key-enum';
import { t } from '@lingui/core/macro';
import { IconArrowMerge } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  footerContainer: {
    background: background['--t-background-primary'],
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-end',
    display: 'flex',
    justifyContent: 'flex-end',
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    paddingBottom: spacing['--t-spacing-3'],
    paddingLeft: spacing['--t-spacing-3'],
    paddingRight: spacing['--t-spacing-3'],
    paddingTop: spacing['--t-spacing-3'],
  },
  footerActions: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-end',
    display: 'flex',
  },
});

type MergeRecordsFooterProps = {
  objectNameSingular: string;
};

export const MergeRecordsFooter = ({
  objectNameSingular,
}: MergeRecordsFooterProps) => {
  const { handleMergeRecords, isMerging } = useMergeRecordsActions({
    objectNameSingular,
  });

  useHotkeysOnFocusedElement({
    keys: [`${Key.Control}+${Key.Enter}`, `${Key.Meta}+${Key.Enter}`],
    callback: () => {
      if (!isMerging) {
        handleMergeRecords();
      }
    },
    focusId: SIDE_PANEL_FOCUS_ID,
    dependencies: [handleMergeRecords, isMerging],
  });

  return (
    <div {...stylex.props(styles.footerContainer)}>
      <div {...stylex.props(styles.footerActions)}>
        <Button
          size="md"
          startIcon={<IconArrowMerge />}
          shortcut={isMerging ? undefined : ['Mod', 'Enter']}
          onClick={handleMergeRecords}
          disabled={isMerging}
          variant="solid"
          color="accent"
        >
          {isMerging ? t`Merging...` : t`Merge`}
        </Button>
      </div>
    </div>
  );
};
