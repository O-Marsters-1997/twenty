'use client';

import { type AppPreviewConfig } from '../types';
import { useAppPreviewNavigation } from './use-app-preview-navigation';

const NO_REVEALED_OBJECT_IDS: string[] = [];

export function useAppPreviewExperience(visual: AppPreviewConfig) {
  const navigation = useAppPreviewNavigation(visual);

  return {
    ...navigation,
    highlightedItemId: null,
    revealedObjectIds: NO_REVEALED_OBJECT_IDS,
    sidebarEntries: visual.sidebar.workspace,
  };
}
