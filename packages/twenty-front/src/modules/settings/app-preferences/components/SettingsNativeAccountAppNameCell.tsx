import { type NativeAccountApp } from '@/settings/app-preferences/types/NativeAccountApp';
import { UndecoratedLink } from '@/ui/navigation/link/components/UndecoratedLink/UndecoratedLink';
import { useLingui } from '@lingui/react/macro';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath } from 'twenty-shared/utils';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { fontColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  nameCell: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-primary'],
    display: 'flex',
  },
});

type SettingsNativeAccountAppNameCellProps = {
  item: NativeAccountApp;
};

export const SettingsNativeAccountAppNameCell = ({
  item,
}: SettingsNativeAccountAppNameCellProps) => {
  const { t } = useLingui();
  const theme = useTheme();

  return (
    <UndecoratedLink
      to={getSettingsPath(SettingsPath.NativeAccountApp, {
        nativeAccountAppId: item.id,
      })}
      onClick={(event) => event.stopPropagation()}
    >
      <div {...stylex.props(styles.nameCell)}>
        <item.Icon size={theme.icon.size.md} />
        {t(item.name)}
      </div>
    </UndecoratedLink>
  );
};
