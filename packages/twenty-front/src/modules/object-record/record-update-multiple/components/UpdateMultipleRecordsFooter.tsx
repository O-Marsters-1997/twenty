import { computeProgressText } from '@/command-menu-item/utils/computeProgressText';
import { SIDE_PANEL_FOCUS_ID } from '@/side-panel/constants/SidePanelFocusId';
import { type ObjectRecordQueryProgress } from '@/object-record/types/ObjectRecordQueryProgress';
import { useHotkeysOnFocusedElement } from '@/ui/utilities/hotkey/hooks/useHotkeysOnFocusedElement';
import { useLingui } from '@lingui/react/macro';

import { Key } from 'ts-key-enum';
import { IconBoxMultiple } from 'twenty-ui/icon';
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
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
  },
  footerActions: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'flex-end',
    display: 'flex',
  },
});

type UpdateMultipleRecordsFooterProps = {
  isUpdating: boolean;
  progress?: ObjectRecordQueryProgress;
  onUpdate: () => void;
  onCancel: () => void;
  isUpdateDisabled?: boolean;
};

export const UpdateMultipleRecordsFooter = ({
  isUpdating,
  progress,
  onUpdate,
  onCancel,
  isUpdateDisabled,
}: UpdateMultipleRecordsFooterProps) => {
  const { t } = useLingui();
  const progressText = computeProgressText(progress);

  useHotkeysOnFocusedElement({
    keys: [`${Key.Control}+${Key.Enter}`, `${Key.Meta}+${Key.Enter}`],
    callback: () => {
      if (!isUpdating && !isUpdateDisabled) {
        onUpdate();
      }
    },
    focusId: SIDE_PANEL_FOCUS_ID,
    dependencies: [onUpdate, isUpdating, isUpdateDisabled],
  });

  return (
    <div {...stylex.props(styles.footerContainer)}>
      <div {...stylex.props(styles.footerActions)}>
        <Button
          size="sm"
          onClick={onCancel}
          variant="outline"
        >{t`Cancel`}</Button>
        <Button
          size="sm"
          startIcon={<IconBoxMultiple />}
          loading={isUpdating && !progressText}
          shortcut={isUpdating ? undefined : ['Mod', 'Enter']}
          onClick={onUpdate}
          disabled={isUpdating || isUpdateDisabled}
          variant="solid"
          color="accent"
        >
          {isUpdating ? t`Apply${progressText}` : t`Apply`}
        </Button>
      </div>
    </div>
  );
};
