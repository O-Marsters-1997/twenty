import { useIsNavigationDrawerContentExpanded } from '@/ui/navigation/navigation-drawer/hooks/useIsNavigationDrawerContentExpanded';
import { useSetAdvancedMode } from '@/navigation/hooks/useSetAdvancedMode';
import { DeveloperModeSwitch } from '@/navigation/components/DeveloperModeSwitch';
import { MOBILE_NAVIGATION_BAR_CLEARANCE } from '@/navigation/constants/MobileNavigationBarClearance';
import { SettingsNavigationDrawerItems } from '@/settings/components/SettingsNavigationDrawerItems';
import { AdvancedSettingsSwitch } from '@/ui/input/components/AdvancedSettingsSwitch';
import { NavigationDrawerScrollableContent } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerScrollableContent';
import { TAB_LIST_HEIGHT } from '@/ui/layout/tab-list/constants/TabListHeight';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { isAdvancedModeEnabledState } from '@/ui/navigation/navigation-drawer/states/isAdvancedModeEnabledState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useIsFeatureEnabled } from '@/workspace/hooks/useIsFeatureEnabled';
import { useLingui } from '@lingui/react/macro';
import { useIsMobile } from 'twenty-ui/utilities';
import { FeatureFlagKey } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { borderColor, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  advancedSettingsSwitchClassName: {
    paddingRight: '0',
  },
  fixedContent: {
    borderTopColor: borderColor['--t-border-color-light'],
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    justifyContent: 'center',
    marginBottom: `calc(-1 * ${spacing['--t-spacing-4']})`,
    marginTop: 'auto',
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
  },
  fixedContentHeight: (height: string) => ({ height }),
  fixedContentMobile: {
    height: 'auto',
    marginBottom: 0,
    paddingLeft: spacing['--t-spacing-5'],
    paddingRight: spacing['--t-spacing-5'],
    paddingTop: spacing['--t-spacing-2'],
  },
  fixedContentClearance: (paddingBottom: string) => ({ paddingBottom }),
});

export const SettingsNavigationDrawerContent = () => {
  const { t } = useLingui();
  const isMobile = useIsMobile();
  const isNavigationDrawerExpanded = useIsNavigationDrawerContentExpanded();
  const isAdvancedModeEnabled = useAtomStateValue(isAdvancedModeEnabledState);
  const { setAdvancedMode } = useSetAdvancedMode();
  const isLogsSettingsSectionEnabled = useIsFeatureEnabled(
    FeatureFlagKey.IS_LOGS_SETTINGS_SECTION_ENABLED,
  );

  return (
    <>
      <NavigationDrawerScrollableContent>
        <SettingsNavigationDrawerItems />
      </NavigationDrawerScrollableContent>

      <div
        {...stylex.props(
          styles.fixedContent,
          isMobile
            ? [
                styles.fixedContentMobile,
                styles.fixedContentClearance(MOBILE_NAVIGATION_BAR_CLEARANCE),
              ]
            : styles.fixedContentHeight(TAB_LIST_HEIGHT),
        )}
      >
        <NavigationDrawerSection>
          {isLogsSettingsSectionEnabled ? (
            <DeveloperModeSwitch
              isEnabled={isAdvancedModeEnabled}
              onEnabledChange={setAdvancedMode}
              isCompact={!isNavigationDrawerExpanded}
            />
          ) : (
            <AdvancedSettingsSwitch
              {...stylex.props(styles.advancedSettingsSwitchClassName)}
              isAdvancedModeEnabled={isAdvancedModeEnabled}
              setIsAdvancedModeEnabled={setAdvancedMode}
              label={t`Advanced`}
              isCompact={!isNavigationDrawerExpanded}
            />
          )}
        </NavigationDrawerSection>
      </div>
    </>
  );
};
