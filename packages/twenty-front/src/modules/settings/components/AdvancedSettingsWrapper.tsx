import { AdvancedSettingsContentWrapperWithDot } from '@/settings/components/AdvancedSettingsContentWrapperWithDot';
import { ADVANCED_SETTINGS_ANIMATION_DURATION } from '@/settings/constants/AdvancedSettingsAnimationDurations';
import { isAdvancedModeEnabledState } from '@/ui/navigation/navigation-drawer/states/isAdvancedModeEnabledState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import * as stylex from '@stylexjs/stylex';
import { Collapsible } from 'twenty-ui/primitives/layout';

const styles = stylex.create({
  root: {
    position: {
      default: null,
      ':empty': 'absolute',
    },
  },
  content: {
    width: '100%',
  },
});

type DotPosition = 'top' | 'centered';

type AdvancedSettingsWrapperProps = {
  children: React.ReactNode;
  animationDimension?: 'width' | 'height';
  hideDot?: boolean;
  dotPosition?: DotPosition;
};

export const AdvancedSettingsWrapper = ({
  children,
  hideDot = false,
  dotPosition = 'centered',
  animationDimension = 'height',
}: AdvancedSettingsWrapperProps) => {
  const isAdvancedModeEnabled = useAtomStateValue(isAdvancedModeEnabledState);

  return (
    <Collapsible.Root
      open={isAdvancedModeEnabled}
      className={stylex.props(styles.root).className}
    >
      <Collapsible.Panel
        dimension={animationDimension}
        style={{
          transitionDuration: `${ADVANCED_SETTINGS_ANIMATION_DURATION.size}s, ${ADVANCED_SETTINGS_ANIMATION_DURATION.opacity}s`,
        }}
        containAnimation={false}
      >
        <AdvancedSettingsContentWrapperWithDot
          hideDot={hideDot}
          dotPosition={dotPosition}
        >
          <div {...stylex.props(styles.content)}>{children}</div>
        </AdvancedSettingsContentWrapperWithDot>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
};
