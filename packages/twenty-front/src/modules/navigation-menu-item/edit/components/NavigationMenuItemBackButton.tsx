import { IconX } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

import { currentNavigationMenuItemFolderIdState } from '@/navigation-menu-item/common/states/currentNavigationMenuItemFolderIdState';
import { useSetAtomState } from '@/ui/utilities/state/jotai/hooks/useSetAtomState';
import * as stylex from '@stylexjs/stylex';
import {
  backgroundTransparent,
  borderRadius,
  font,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  backButton: {
    alignItems: 'center',
    background: {
      default: 'transparent',
      ':hover': backgroundTransparent['--t-background-transparent-light'],
    },
    borderStyle: 'none',
    color: fontColor['--t-font-color-secondary'],
    cursor: 'pointer',
    display: 'flex',
    fontFamily: font['--t-font-family'],
    fontWeight: fontWeight['--t-font-weight-medium'],
    gap: spacing['--t-spacing-2'],
    paddingBottom: spacing['--t-spacing-1'],
    paddingLeft: spacing['--t-spacing-1'],
    paddingRight: spacing['--t-spacing-0_5'],
    paddingTop: spacing['--t-spacing-1'],
    textAlign: 'left',
    width: '100%',
    borderTopLeftRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm'],
    },
    borderTopRightRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm'],
    },
    borderBottomRightRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm'],
    },
    borderBottomLeftRadius: {
      default: null,
      ':hover': borderRadius['--t-border-radius-sm'],
    },
  },
});

type NavigationMenuItemBackButtonProps = {
  folderName: string;
};

export const NavigationMenuItemBackButton = ({
  folderName,
}: NavigationMenuItemBackButtonProps) => {
  const theme = useTheme();
  const setCurrentNavigationMenuItemFolderId = useSetAtomState(
    currentNavigationMenuItemFolderIdState,
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentNavigationMenuItemFolderId(null);
  };

  return (
    <button onClick={handleClick} {...stylex.props(styles.backButton)}>
      <IconX
        size={theme.icon.size.md}
        stroke={theme.icon.stroke.lg}
        color={theme.font.color.tertiary}
      />
      <span>{folderName}</span>
    </button>
  );
};
