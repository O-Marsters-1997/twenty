import { styled } from '@linaria/react';
import { useLingui } from '@lingui/react/macro';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtomValue } from 'jotai';
import { isDefined } from 'twenty-shared/utils';
import { IconCheck, IconPaint } from 'twenty-ui/icon';
import { GRAY_SCALE_LIGHT, useTheme, themeCssVariables } from 'twenty-ui/theme';

import { LayoutCustomizationBarMenuDropdown } from '@/layout-customization/components/LayoutCustomizationBarMenuDropdown';
import { LayoutCustomizationBarResetConfirmationModal } from '@/layout-customization/components/LayoutCustomizationBarResetConfirmationModal';
import { useCancelLayoutCustomization } from '@/layout-customization/hooks/useCancelLayoutCustomization';
import { useIsLayoutCustomizationDirty } from '@/layout-customization/hooks/useIsLayoutCustomizationDirty';
import { useSaveLayoutCustomization } from '@/layout-customization/hooks/useSaveLayoutCustomization';
import { isLayoutCustomizationModeEnabledState } from '@/layout-customization/states/isLayoutCustomizationModeEnabledState';
import { objectMetadataItemsSelector } from '@/object-metadata/states/objectMetadataItemsSelector';
import { currentPageLayoutIdState } from '@/page-layout/states/currentPageLayoutIdState';
import { pageLayoutPersistedComponentState } from '@/page-layout/states/pageLayoutPersistedComponentState';
import { SaveAndCancelButtons } from '@/settings/components/SaveAndCancelButtons/SaveAndCancelButtons';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { PageLayoutType } from '~/generated-metadata/graphql';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const StyledAnimatedContainer = styled(motion.div)`
  flex-shrink: 0;
  overflow: hidden;
`;

const StyledContainer = styled.div`
  align-items: center;
  background: ${themeCssVariables.color.blue};
  box-sizing: border-box;
  color: ${GRAY_SCALE_LIGHT.gray1};
  display: flex;
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  width: 100%;

  button,
  button * {
    color: ${GRAY_SCALE_LIGHT.gray1};
  }

  button {
    --tw-button-color: ${GRAY_SCALE_LIGHT.gray1} !important;
  }

  button[type='submit']:not(:disabled):not(:focus) {
    border-color: color(display-p3 1 1 1 / 0.5);
  }
`;

const styles = stylex.create({
  leftSection: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-2'],
  },
  title: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    gap: spacing['--t-spacing-2'],
    justifyContent: 'center',
    textAlign: 'center',
  },
  rightSection: {
    alignItems: 'center',
    display: 'flex',
    flex: '1',
    justifyContent: 'flex-end',
  },
});

const LayoutCustomizationBarContent = () => {
  const theme = useTheme();
  const { t } = useLingui();

  const { save, isSaving } = useSaveLayoutCustomization();
  const { cancel } = useCancelLayoutCustomization();
  const { isDirty } = useIsLayoutCustomizationDirty();

  const currentPageLayoutId = useAtomStateValue(currentPageLayoutIdState);
  const persistedPageLayout = useAtomValue(
    pageLayoutPersistedComponentState.atomFamily({
      instanceId: currentPageLayoutId ?? '',
    }),
  );
  const objectMetadataItems = useAtomStateValue(objectMetadataItemsSelector);

  const recordPageLayoutObject =
    isDefined(currentPageLayoutId) &&
    persistedPageLayout?.type === PageLayoutType.RECORD_PAGE
      ? objectMetadataItems.find(
          (item) => item.id === persistedPageLayout.objectMetadataId,
        )
      : undefined;

  const title = isDefined(recordPageLayoutObject)
    ? t`${recordPageLayoutObject.labelPlural} layout edition`
    : t`Layout customization`;

  return (
    <StyledAnimatedContainer
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        duration: theme.animation.duration.normal,
        ease: 'easeInOut',
      }}
    >
      <StyledContainer data-globally-prevent-click-outside="true">
        <div {...stylex.props(styles.leftSection)}>
          {isDefined(recordPageLayoutObject) && (
            <LayoutCustomizationBarMenuDropdown />
          )}
        </div>
        <span {...stylex.props(styles.title)}>
          <IconPaint size={theme.icon.size.md} />
          {title}
        </span>
        <div {...stylex.props(styles.rightSection)}>
          <SaveAndCancelButtons
            onSave={save}
            onCancel={cancel}
            isSaveDisabled={!isDirty || isSaving}
            isCancelDisabled={isSaving}
            isLoading={isSaving}
            inverted
            saveIcon={IconCheck}
          />
        </div>
      </StyledContainer>
      {isDefined(recordPageLayoutObject) && isDefined(currentPageLayoutId) && (
        <LayoutCustomizationBarResetConfirmationModal
          pageLayoutId={currentPageLayoutId}
        />
      )}
    </StyledAnimatedContainer>
  );
};

export const LayoutCustomizationBar = () => {
  const isLayoutCustomizationModeEnabled = useAtomStateValue(
    isLayoutCustomizationModeEnabledState,
  );

  return (
    <AnimatePresence>
      {isLayoutCustomizationModeEnabled && <LayoutCustomizationBarContent />}
    </AnimatePresence>
  );
};
