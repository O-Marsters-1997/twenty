import { useLingui } from '@lingui/react/macro';
import { AnimatePresence, motion } from 'framer-motion';
import { useAtomValue } from 'jotai';
import { isDefined } from 'twenty-shared/utils';
import { IconCheck, IconPaint } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';

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
import { color, spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  animatedContainer: {
    overflow: 'hidden',
    flexShrink: 0,
  },
  container: {
    background: color['--t-color-blue'],
    paddingBlock: spacing['--t-spacing-2'],
    paddingInline: spacing['--t-spacing-3'],
    alignItems: 'center',
    boxSizing: 'border-box',
    color: color['--t-color-gray1'],
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftSection: {
    flex: '1',
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
  },
  title: {
    flex: '1',
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    textAlign: 'center',
  },
  rightSection: {
    flex: '1',
    alignItems: 'center',
    display: 'flex',
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
    <motion.div
      {...stylex.props(styles.animatedContainer)}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        duration: theme.animation.duration.normal,
        ease: 'easeInOut',
      }}
    >
      <div
        {...stylex.props(styles.container)}
        data-globally-prevent-click-outside="true"
      >
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
      </div>
      {isDefined(recordPageLayoutObject) && isDefined(currentPageLayoutId) && (
        <LayoutCustomizationBarResetConfirmationModal
          pageLayoutId={currentPageLayoutId}
        />
      )}
    </motion.div>
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
