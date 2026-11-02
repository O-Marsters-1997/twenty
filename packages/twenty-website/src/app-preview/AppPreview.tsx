'use client';

import { useEffect } from 'react';

import { scheduleIdleTask } from '@/platform/motion';

import { APP_PREVIEW_CONFIG } from './data/sidebar-config';
import { PreviewAppLayout } from './shell/PreviewAppLayout';
import { useAppPreviewExperience } from './shell/use-app-preview-experience';
import { AppWindow } from './stage/AppWindow';
import { ProductFrame } from './stage/ProductFrame';
import { WindowOrderProvider } from './stage/WindowOrderProvider';
export function AppPreview({
  mode = 'windowed',
}: {
  mode?: 'static' | 'windowed';
}) {
  useEffect(
    () =>
      scheduleIdleTask(() => {
        void import('./pages/dashboard/DashboardPage');
      }),
    [],
  );
  const experience = useAppPreviewExperience(APP_PREVIEW_CONFIG);
  const {
    activeItem,
    activeItemId,
    activePage,
    highlightedItemId,
    revealedObjectIds,
    sidebarEntries,
  } = experience;
  const appShell = (
    <PreviewAppLayout
      activeItem={activeItem}
      activeItemId={activeItemId}
      favorites={APP_PREVIEW_CONFIG.sidebar.favorites}
      highlightedItemId={highlightedItemId}
      navbarActions={activePage.header.navbarActions}
      navbarLabel={activeItem.label}
      onSelectPageItem={experience.selectPageItem}
      onToggleFolder={experience.toggleFolder}
      openFolderIds={experience.openFolderIds}
      page={activePage}
      revealedObjectIds={revealedObjectIds}
      workspaceEntries={sidebarEntries}
    />
  );

  if (mode === 'static') {
    return <ProductFrame>{appShell}</ProductFrame>;
  }
  return (
    <WindowOrderProvider>
      <AppWindow>{appShell}</AppWindow>
    </WindowOrderProvider>
  );
}
