import { t } from '@lingui/core/macro';
import { TintedIconTile } from 'twenty-ui/components/data-display';
import { LightIconButton } from 'twenty-ui/components/input';
import {
  IconBuildingSkyscraper,
  IconDotsVertical,
  IconLayoutSidebarRight,
  IconPlus,
} from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { useTheme } from 'twenty-ui/theme';

import { BackgroundMockTable } from '@/sign-in-background-mock/components/BackgroundMockTable';
import { BackgroundMockViewBar } from '@/sign-in-background-mock/components/BackgroundMockViewBar';
import { PageCardHeader } from '@/ui/layout/page/components/PageCardHeader';
import { PageCardLayout } from '@/ui/layout/page/components/PageCardLayout';
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  tableContainer: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    minHeight: '0',
    overflow: 'hidden',
    width: '100%',
  },
});

export const BackgroundMockPage = () => {
  const theme = useTheme();

  return (
    <PageCardLayout
      header={
        <PageCardHeader
          icon={
            <TintedIconTile
              icon={<IconBuildingSkyscraper size={theme.icon.size.md} />}
              color="blue"
            />
          }
          title={t`Companies`}
          actionButton={
            <>
              <Button
                startIcon={<IconPlus />}
                size="sm"
                variant="solid"
                color="accent"
              >{t`New Company`}</Button>
              <LightIconButton
                emphasis="subtle"
                size="sm"
                aria-label={t`More options`}
              >
                <IconDotsVertical />
              </LightIconButton>
              <Button
                startIcon={<IconLayoutSidebarRight />}
                aria-label={t`Open side panel`}
                size="sm"
                variant="outline"
              />
            </>
          }
        />
      }
      secondaryBar={<BackgroundMockViewBar />}
      showInformationBanner={false}
    >
      <div {...stylex.props(styles.tableContainer)}>
        <BackgroundMockTable />
      </div>
    </PageCardLayout>
  );
};
