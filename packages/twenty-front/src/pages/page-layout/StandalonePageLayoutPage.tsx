import * as stylex from '@stylexjs/stylex';
import { media } from 'twenty-ui/theme/constants.stylex';
import { useParams } from 'react-router-dom';

import { CommandMenuComponentInstanceContext } from '@/command-menu/states/contexts/CommandMenuComponentInstanceContext';
import { PageLayoutRenderer } from '@/page-layout/components/PageLayoutRenderer';
import { LayoutRenderingProvider } from '@/ui/layout/contexts/LayoutRenderingContext';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import { isDefined } from 'twenty-shared/utils';
import { PageLayoutType } from '~/generated-metadata/graphql';
import { StandalonePageHeader } from '~/pages/page-layout/StandalonePageHeader';

const styles = stylex.create({
  pageLayoutContainer: {
    display: { default: 'flex', [media.print]: 'block' },
    flex: 1,
    flexDirection: 'column',
    minHeight: { default: 0, [media.print]: 'auto' },
    overflowY: { default: 'auto', [media.print]: 'visible' },
  },
});

export const StandalonePageLayoutPage = () => {
  const { pageLayoutId } = useParams<{ pageLayoutId: string }>();

  if (!isDefined(pageLayoutId)) {
    return null;
  }

  return (
    <CommandMenuComponentInstanceContext.Provider
      value={{ instanceId: pageLayoutId }}
    >
      <PageCardLayout
        header={<StandalonePageHeader pageLayoutId={pageLayoutId} />}
      >
        <LayoutRenderingProvider
          value={{
            targetRecordIdentifier: undefined,
            layoutType: PageLayoutType.STANDALONE_PAGE,
          }}
        >
          <div {...stylex.props(styles.pageLayoutContainer)}>
            <PageLayoutRenderer pageLayoutId={pageLayoutId} />
          </div>
        </LayoutRenderingProvider>
      </PageCardLayout>
    </CommandMenuComponentInstanceContext.Provider>
  );
};
