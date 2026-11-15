import { styled } from '@linaria/react';
import { type MouseEvent, useId } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Key } from 'ts-key-enum';
import { isDefined } from 'twenty-shared/utils';
import { Checkbox } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

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
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledThreadItem = styled.div<{
  $isSelected: boolean;
  $isChecked: boolean;
}>`
  align-items: flex-start;
  background: ${({ $isSelected, $isChecked }) =>
    $isChecked
      ? themeCssVariables.accent.tertiary
      : $isSelected
        ? themeCssVariables.background.transparent.light
        : 'none'};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  cursor: pointer;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  padding: ${themeCssVariables.spacing[4]};
  position: relative;

  &:hover {
    background: ${({ $isChecked }) =>
      $isChecked
        ? themeCssVariables.accent.tertiary
        : themeCssVariables.background.transparent.light};
  }
`;

const styles = stylex.create({
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

// The checkbox takes the avatar's place while the chat is checked, or while
// the row is hovered or focused; without hover, a tap on the avatar checks it
const StyledCheckboxContainer = styled.div<{ $isChecked: boolean }>`
  display: ${({ $isChecked }) => ($isChecked ? 'flex' : 'none')};

  ${StyledThreadItem}:focus-within & {
    display: flex;
  }

  @media (hover: hover) {
    ${StyledThreadItem}:hover & {
      display: flex;
    }
  }
`;

const StyledAvatarContainer = styled.div<{
  $isCheckable: boolean;
  $isChecked: boolean;
}>`
  display: ${({ $isChecked }) => ($isChecked ? 'none' : 'flex')};

  ${StyledThreadItem}:focus-within & {
    display: ${({ $isCheckable, $isChecked }) =>
      $isCheckable || $isChecked ? 'none' : 'flex'};
  }

  @media (hover: hover) {
    ${StyledThreadItem}:hover & {
      display: ${({ $isCheckable, $isChecked }) =>
        $isCheckable || $isChecked ? 'none' : 'flex'};
    }
  }
`;

const StyledActivityTimeContainer = styled.div<{ $isDropdownOpen: boolean }>`
  visibility: ${({ $isDropdownOpen }) =>
    $isDropdownOpen ? 'hidden' : 'visible'};

  ${StyledThreadItem}:hover & {
    visibility: hidden;
  }
`;

const StyledMenuTrigger = styled.div<{ $isDropdownOpen: boolean }>`
  opacity: ${({ $isDropdownOpen }) => ($isDropdownOpen ? 1 : 0)};
  pointer-events: ${({ $isDropdownOpen }) =>
    $isDropdownOpen ? 'auto' : 'none'};
  position: absolute;
  right: ${themeCssVariables.spacing[3]};
  top: ${themeCssVariables.spacing[3]};
  transition: opacity 150ms;

  ${StyledThreadItem}:hover & {
    opacity: 1;
    pointer-events: auto;
  }
`;

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
    <StyledThreadItem
      $isSelected={isSelected}
      $isChecked={isChecked}
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
        } {...stylex.props(styles.leading)}
      >
        {isDefined(onCheckboxClick) && (
          <StyledCheckboxContainer $isChecked={isChecked}>
            <Checkbox checked={isChecked} aria-label={t`Select chat`} />
          </StyledCheckboxContainer>
        )}
        <StyledAvatarContainer
          $isCheckable={isDefined(onCheckboxClick)}
          $isChecked={isChecked}
        >
          <AiChatThreadAvatar thread={thread} />
        </StyledAvatarContainer>
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
            <StyledActivityTimeContainer $isDropdownOpen={isDropdownOpen}>
              <AiChatThreadActivityTime thread={thread} />
            </StyledActivityTimeContainer>
          </div>
        )}
        <AiChatThreadSubtitle thread={thread} />
      </div>
      <StyledMenuTrigger
        $isDropdownOpen={isDropdownOpen}
        onClick={(event) => event.stopPropagation()}
      >
        <AiChatThreadActionsDropdown
          thread={thread}
          instanceId={actionsInstanceId}
          onRenameRequested={startRename}
          onDetach={onDetach}
        />
      </StyledMenuTrigger>
    </StyledThreadItem>
  );
};
