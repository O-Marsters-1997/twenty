import { LAYOUT_CUSTOMIZATION_BAR_DROPDOWN_ID } from '@/layout-customization/constants/LayoutCustomizationBarDropdownId';
import { useLingui } from '@lingui/react/macro';
import { IconDotsVertical, IconReload } from 'twenty-ui/icon';
import { DropdownRoot } from '@/ui/layout/dropdown/components/DropdownRoot';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { GenericDropdownContentWidth } from '@/ui/layout/dropdown/constants/GenericDropdownContentWidth';
import { LightIconButton } from 'twenty-ui/components/input';
import { Dropdown } from 'twenty-ui/components/navigation';
import * as stylex from '@stylexjs/stylex';
import { backgroundTransparent, color } from 'twenty-ui/theme/tokens.stylex';

import { RESET_RECORD_PAGE_LAYOUT_MODAL_ID } from '@/layout-customization/constants/ResetRecordPageLayoutModalId';
import { useDialog } from '@/ui/layout/dialog/hooks/useDialog';

const styles = stylex.create({
  wrapper: {
    alignItems: 'center',
    display: 'flex',
  },
  invertedButton: {
    background: {
      default: null,
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    color: color['--t-color-gray1'],
  },
});

export const LayoutCustomizationBarMenuDropdown = () => {
  const { t } = useLingui();
  const { openDialog } = useDialog();

  const handleResetClick = () => {
    openDialog(RESET_RECORD_PAGE_LAYOUT_MODAL_ID);
  };

  return (
    <DropdownRoot dropdownId={LAYOUT_CUSTOMIZATION_BAR_DROPDOWN_ID} type="menu">
      <span {...stylex.props(styles.wrapper)}>
        <Dropdown.Trigger
          render={
            <LightIconButton
              {...stylex.props(styles.invertedButton)}
              emphasis="subtle"
              aria-label={t`Layout customization menu`}
            >
              <IconDotsVertical />
            </LightIconButton>
          }
        />
      </span>
      <DropdownContent width={GenericDropdownContentWidth.Large}>
        <Dropdown.Section>
          <Dropdown.ActionItem
            startIcon={<IconReload />}
            onClick={handleResetClick}
          >
            {t`Reset record page layout`}
          </Dropdown.ActionItem>
        </Dropdown.Section>
      </DropdownContent>
    </DropdownRoot>
  );
};
