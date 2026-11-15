import { type MouseEvent, useId } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { Checkbox } from 'twenty-ui/primitives/input';

import { AiChatThreadActionsDropdown } from '@/ai/components/AiChatThreadActionsDropdown';
import { AiChatThreadActivityTime } from '@/ai/components/AiChatThreadActivityTime';
import { AiChatThreadAvatar } from '@/ai/components/AiChatThreadAvatar';
import { AiChatThreadSubtitle } from '@/ai/components/AiChatThreadSubtitle';
import { AiChatThreadTitle } from '@/ai/components/AiChatThreadTitle';
import { type AgentChatThreadRecord } from '@/ai/types/AgentChatThreadRecord';
import { useAiChatThreadRename } from '@/ai/hooks/useAiChatThreadRename';
import { getCommandMenuDropdownIdFromCommandMenuId } from '@/command-menu-item/utils/getCommandMenuDropdownIdFromCommandMenuId';
import { TextInput } from '@/ui/input/components/TextInput';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import * as stylex from '@stylexjs/stylex';
import {
  accent,
  backgroundTransparent,
  borderColor,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';
import { media } from 'twenty-ui/theme/constants.stylex';

const itemMarker = stylex.defineMarker();

const styles = stylex.create({
  item: {
    alignItems: 'flex-start',
    backgroundColor: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderBottomColor: borderColor['--t-border-color-light'],
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    cursor: 'pointer',
    display: 'flex',
    gap: spacing['--t-spacing-3'],
    padding: spacing['--t-spacing-4'],
    position: 'relative',
  },
  itemSelected: {
    backgroundColor: backgroundTransparent['--t-background-transparent-light'],
  },
  itemChecked: {
    backgroundColor: accent['--t-accent-tertiary'],
  },
  checkbox: {
    display: {
      default: 'none',
      [stylex.when.ancestor(':focus-within', itemMarker)]: 'flex',
      [media.hoverCapable]: {
        default: null,
        [stylex.when.ancestor(':hover', itemMarker)]: 'flex',
      },
    },
  },
  checkboxChecked: {
    display: 'flex',
  },
  avatar: {
    display: 'flex',
  },
  avatarCheckable: {
    display: {
      default: 'flex',
      [stylex.when.ancestor(':focus-within', itemMarker)]: 'none',
      [media.hoverCapable]: {
        default: null,
        [stylex.when.ancestor(':hover', itemMarker)]: 'none',
      },
    },
  },
  avatarChecked: {
    display: 'none',
  },
  activityTime: {
    visibility: {
      default: 'visible',
      [stylex.when.ancestor(':hover', itemMarker)]: 'hidden',
    },
  },
  activityTimeHidden: {
    visibility: 'hidden',
  },
  menuTrigger: {
    opacity: { default: 0, [stylex.when.ancestor(':hover', itemMarker)]: 1 },
    pointerEvents: {
      default: 'none',
      [stylex.when.ancestor(':hover', itemMarker)]: 'auto',
    },
    position: 'absolute',
    right: spacing['--t-spacing-3'],
    top: spacing['--t-spacing-3'],
    transitionDuration: '150ms',
    transitionProperty: 'opacity',
  },
  menuTriggerOpen: {
    opacity: 1,
    pointerEvents: 'auto',
  },
  leading: {
    display: 'flex',
    flexShrink: '0',
    justifyContent: 'center',
    paddingTop: spacing['--t-spacing-0_5'],
    width: spacing['--t-spacing-7'],
  },
  threadContent: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minWidth: '0',
  },
  threadHeading: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-2'],
    minWidth: '0',
  },
});

type AiChatThreadListItemProps = {
  thread: AgentChatThreadRecord;
  isSelected: boolean;
  isChecked?: boolean;
  onClick: (
    thread: AgentChatThreadRecord,
    event: MouseEvent<HTMLDivElement>,
  ) => void;
  onCheckboxClick?: (
    thread: AgentChatThreadRecord,
    event: MouseEvent<HTMLDivElement>,
  ) => void;
  onContextMenu?: (
    thread: AgentChatThreadRecord,
    event: MouseEvent<HTMLDivElement>,
  ) => void;
  onDetach?: () => void;
};

export const AiChatThreadListItem = ({
  thread,
  isSelected,
  isChecked = false,
  onClick,
  onCheckboxClick,
  onContextMenu,
  onDetach,
}: AiChatThreadListItemProps) => {
  const { t } = useLingui();
  const {
    isRenaming,
    draftTitle,
    setDraftTitle,
    startRename,
    cancelRename,
    commitRename,
  } = useAiChatThreadRename(thread);

  const actionsInstanceId = useId();
  const itemMenuDropdownId =
    getCommandMenuDropdownIdFromCommandMenuId(actionsInstanceId);
  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    itemMenuDropdownId,
  );

  return (
    <div
      {...stylex.props(
        styles.item,
        itemMarker,
        isSelected && styles.itemSelected,
        isChecked && styles.itemChecked,
      )}
      data-selectable-id={thread.id}
      data-select-disable={isRenaming || undefined}
      onMouseDown={(event) => {
        // Shift+click selects a range of chats, not the text in between
        if (event.shiftKey && !isRenaming) {
          event.preventDefault();
        }
      }}
      onClick={(event) => {
        if (!isRenaming) {
          onClick(thread, event);
        }
      }}
      onContextMenu={(event) => {
        if (!isRenaming) {
          onContextMenu?.(thread, event);
        }
      }}
    >
      <div
        data-select-disable={isDefined(onCheckboxClick) || undefined}
        onClick={
          isDefined(onCheckboxClick)
            ? (event) => {
                event.stopPropagation();
                onCheckboxClick(thread, event);
              }
            : undefined
        }
        {...stylex.props(styles.leading)}
      >
        {isDefined(onCheckboxClick) && (
          <div
            {...stylex.props(
              styles.checkbox,
              isChecked && styles.checkboxChecked,
            )}
          >
            <Checkbox checked={isChecked} aria-label={t`Select chat`} />
          </div>
        )}
        <div
          {...stylex.props(
            styles.avatar,
            isChecked
              ? styles.avatarChecked
              : isDefined(onCheckboxClick) && styles.avatarCheckable,
          )}
        >
          <AiChatThreadAvatar thread={thread} />
        </div>
      </div>
      <div {...stylex.props(styles.threadContent)}>
        {isRenaming ? (
          <TextInput
            value={draftTitle}
            onChange={setDraftTitle}
            onClick={(event) => event.stopPropagation()}
            onFocus={(event) => event.target.select()}
            onBlur={() => commitRename(draftTitle)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) {
                return;
              }
              if (event.key === Key.Enter) {
                event.preventDefault();
                void commitRename(draftTitle);
              } else if (event.key === Key.Escape) {
                event.preventDefault();
                cancelRename();
              }
            }}
            sizeVariant="sm"
            fullWidth
            autoFocus
            aria-label={t`Rename chat`}
          />
        ) : (
          <div {...stylex.props(styles.threadHeading)}>
            <AiChatThreadTitle thread={thread} />
            <div
              {...stylex.props(
                styles.activityTime,
                isDropdownOpen && styles.activityTimeHidden,
              )}
            >
              <AiChatThreadActivityTime thread={thread} />
            </div>
          </div>
        )}
        <AiChatThreadSubtitle thread={thread} />
      </div>
      <div
        {...stylex.props(
          styles.menuTrigger,
          isDropdownOpen && styles.menuTriggerOpen,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <AiChatThreadActionsDropdown
          thread={thread}
          instanceId={actionsInstanceId}
          onRenameRequested={startRename}
          onDetach={onDetach}
        />
      </div>
    </div>
  );
};
