import { useDebouncedSetAndPersistViewName } from '@/object-record/object-options-dropdown/hooks/useDebouncedSetAndPersistViewName';
import { useObjectOptionsDropdown } from '@/object-record/object-options-dropdown/hooks/useObjectOptionsDropdown';
import { useUpdateObjectViewOptions } from '@/object-record/object-options-dropdown/hooks/useUpdateObjectViewOptions';
import { IconPicker } from '@/ui/input/components/IconPicker';
import { TextInput } from '@/ui/input/components/TextInput';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { useAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useAtomComponentState';
import { useSetAtomComponentState } from '@/ui/utilities/state/jotai/hooks/useSetAtomComponentState';
import { type View } from '@/views/types/View';
import { viewPickerIsDirtyComponentState } from '@/views/view-picker/states/viewPickerIsDirtyComponentState';
import { viewPickerSelectedIconComponentState } from '@/views/view-picker/states/viewPickerSelectedIconComponentState';
import { useEffect, useRef, useState } from 'react';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  dropdownMenuIconAndNameContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    marginLeft: '0',
    marginRight: '0',
  },
  menuTitleContainer: {
    alignItems: 'center',
    display: 'flex',
    gap: spacing['--t-spacing-1'],
    paddingTop: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-1'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
  },
  menuIconContainer: {
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
    height: spacing['--t-spacing-6'],
    justifyContent: 'center',
    width: spacing['--t-spacing-6'],
  },
  mainText: {
    color: fontColor['--t-font-color-primary'],
    flexShrink: '0',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type ObjectOptionsDropdownMenuViewNameProps = {
  currentView: Pick<View, 'name' | 'icon' | 'key'>;
};

export const ObjectOptionsDropdownMenuViewName = ({
  currentView,
}: ObjectOptionsDropdownMenuViewNameProps) => {
  const theme = useTheme();
  const [viewPickerSelectedIcon, setViewPickerSelectedIcon] =
    useAtomComponentState(viewPickerSelectedIconComponentState);

  const setViewPickerIsDirty = useSetAtomComponentState(
    viewPickerIsDirtyComponentState,
  );

  const { setAndPersistViewIcon } = useUpdateObjectViewOptions();

  const [viewName, setViewName] = useState(currentView?.name);

  const inputRef = useRef<HTMLInputElement>(null);
  const { dropdownId } = useObjectOptionsDropdown();
  const { debouncedSetAndPersistViewName } = useDebouncedSetAndPersistViewName({
    focusId: dropdownId,
  });

  const handleIconChange = ({ iconKey }: { iconKey: string }) => {
    setViewPickerIsDirty(true);
    setViewPickerSelectedIcon(iconKey);
    setAndPersistViewIcon(iconKey);
  };

  useEffect(() => {
    setViewPickerSelectedIcon(currentView.icon);
  }, [currentView.icon, setViewPickerSelectedIcon]);

  useEffect(() => {
    if (currentView?.key !== 'INDEX' && inputRef.current !== null) {
      inputRef.current.focus();
    }
  }, [currentView?.key]);

  const { getIcon } = useIcons();
  const MainIcon = getIcon(currentView?.icon);

  return (
    <>
      {currentView?.key === 'INDEX' ? (
        <div {...stylex.props(styles.menuTitleContainer)}>
          <div {...stylex.props(styles.menuIconContainer)}>
            <MainIcon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
          </div>
          <div {...stylex.props(styles.mainText)}>
            <OverflowingTextWithTooltip text={currentView.name} />
          </div>
        </div>
      ) : (
        <DropdownMenuItemsContainer>
          <div {...stylex.props(styles.dropdownMenuIconAndNameContainer)}>
            <IconPicker
              size="sm"
              onChange={handleIconChange}
              selectedIconKey={viewPickerSelectedIcon}
            />
            <TextInput
              value={viewName}
              onChange={(value) => {
                setViewName(value);
                debouncedSetAndPersistViewName(value);
              }}
              autoGrow={false}
              sizeVariant="sm"
              fullWidth
            />
          </div>
        </DropdownMenuItemsContainer>
      )}
    </>
  );
};
