import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { useRecordIndexContextOrThrow } from '@/object-record/record-index/contexts/RecordIndexContext';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { StyledDropdownButtonContainer } from '@/ui/layout/dropdown/components/StyledDropdownButtonContainer';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { useGetRecordIndexTotalCount } from '@/views/hooks/internal/useGetRecordIndexTotalCount';
import { useGetCurrentViewOnly } from '@/views/hooks/useGetCurrentViewOnly';
import { ViewPickerContentCreateMode } from '@/views/view-picker/components/ViewPickerContentCreateMode';
import { ViewPickerContentEditMode } from '@/views/view-picker/components/ViewPickerContentEditMode';
import { ViewPickerContentEffect } from '@/views/view-picker/components/ViewPickerContentEffect';
import { ViewPickerListContent } from '@/views/view-picker/components/ViewPickerListContent';
import { useUpdateViewFromCurrentState } from '@/views/view-picker/hooks/useUpdateViewFromCurrentState';
import { useViewPickerMode } from '@/views/view-picker/hooks/useViewPickerMode';
import { getViewPickerDropdownId } from '@/views/view-picker/utils/getViewPickerDropdownId';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { OverflowingTextWithTooltip } from 'twenty-ui/primitives/typography';
import { IconChevronDown, IconList, useIcons } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { grayScale, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  iconContainer: {
    display: 'flex',
    flexShrink: '0',
  },
  dropdownLabelAdornments: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    color: grayScale['--t-gray-scale-gray8'],
    display: 'flex',
    flexShrink: '0',
    marginLeft: spacing['--t-spacing-1'],
  },
  viewName: {
    overflow: 'hidden',
    marginLeft: spacing['--t-spacing-1'],
    maxWidth: {
      default: '130px',
      '@media (max-width: 375px)': '90px',
      '@media (min-width: 376px) and (max-width: 768px)': '110px',
    },
    minWidth: 0,
  },
});

export const ViewPickerDropdown = () => {
  const theme = useTheme();
  const { currentView } = useGetCurrentViewOnly();

  const { updateViewFromCurrentState } = useUpdateViewFromCurrentState();

  const { totalCount } = useGetRecordIndexTotalCount();

  const { formatNumber } = useNumberFormat();

  const { recordIndexId } = useRecordIndexContextOrThrow();
  const dropdownId = getViewPickerDropdownId(recordIndexId);

  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );

  const { viewPickerMode, setViewPickerMode } = useViewPickerMode();

  const { getIcon } = useIcons();
  const CurrentViewIcon = getIcon(currentView?.icon);

  const handleClickOutside = async () => {
    if (isDropdownOpen && viewPickerMode === 'edit') {
      await updateViewFromCurrentState();
    }
    setViewPickerMode('list');
  };

  return (
    <Dropdown
      dropdownId={dropdownId}
      dropdownOffset={{ x: 0, y: 8 }}
      dropdownPlacement="bottom-start"
      onClickOutside={handleClickOutside}
      clickableComponent={
        <StyledDropdownButtonContainer isUnfolded={isDropdownOpen}>
          <span {...stylex.props(styles.iconContainer)}>
            {isDefined(currentView) && isDefined(CurrentViewIcon) ? (
              <CurrentViewIcon size={theme.icon.size.md} />
            ) : (
              <IconList size={theme.icon.size.md} />
            )}
          </span>
          <span {...stylex.props(styles.viewName)}>
            <OverflowingTextWithTooltip text={currentView?.name ?? t`All`} />
          </span>
          <span {...stylex.props(styles.dropdownLabelAdornments)}>
            {isDefined(totalCount) && <>· {formatNumber(totalCount)} </>}
            <IconChevronDown size={theme.icon.size.sm} />
          </span>
        </StyledDropdownButtonContainer>
      }
      dropdownComponents={(() => {
        switch (viewPickerMode) {
          case 'list':
            return <ViewPickerListContent />;
          case 'create-empty':
          case 'create-from-current':
            return (
              <>
                <ViewPickerContentCreateMode />
                <ViewPickerContentEffect />
              </>
            );
          case 'edit':
            return (
              <>
                <ViewPickerContentEditMode />
                <ViewPickerContentEffect />
              </>
            );
          default:
            return null;
        }
      })()}
    />
  );
};
