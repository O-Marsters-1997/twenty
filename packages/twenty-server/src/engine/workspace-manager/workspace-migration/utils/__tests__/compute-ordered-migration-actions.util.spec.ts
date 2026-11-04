import {
  ALL_METADATA_NAME,
  type AllMetadataName,
} from 'twenty-shared/metadata';

import { type WorkspaceMigrationActionType } from 'src/engine/metadata-modules/flat-entity/types/metadata-workspace-migration-action.type';
import { createEmptyOrchestratorActionsReport } from 'src/engine/workspace-manager/workspace-migration/constant/empty-orchestrator-actions-report.constant';
import { computeOrderedMigrationActions } from 'src/engine/workspace-manager/workspace-migration/utils/compute-ordered-migration-actions.util';
import { type UniversalCreatePageLayoutTabAction } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/page-layout-tab/types/workspace-migration-page-layout-tab-action.type';
import {
  type UniversalCreatePageLayoutAction,
  type UniversalUpdatePageLayoutAction,
} from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/page-layout/types/workspace-migration-page-layout-action.type';
import { type UniversalCreateViewSortAction } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/view-sort/types/workspace-migration-view-sort-action.type';

describe('computeOrderedMigrationActions', () => {
  it('should remove a replaced view sort before creating its replacement', () => {
    const orchestratorActionsReport = createEmptyOrchestratorActionsReport();
    const oldSortDeleteAction = {
      type: 'delete',
      metadataName: 'viewSort',
      universalIdentifier: 'old-sort',
    } as const;
    const replacementSortCreateAction = {
      type: 'create',
      metadataName: 'viewSort',
      flatEntity: {
        universalIdentifier: 'replacement-sort',
        viewUniversalIdentifier: 'view',
        fieldMetadataUniversalIdentifier: 'field',
      },
    } as unknown as UniversalCreateViewSortAction;

    orchestratorActionsReport.viewSort.delete.push(oldSortDeleteAction);
    orchestratorActionsReport.viewSort.create.push(replacementSortCreateAction);

    const orderedActions = computeOrderedMigrationActions(
      orchestratorActionsReport,
    );

    expect(orderedActions.indexOf(oldSortDeleteAction)).toBeLessThan(
      orderedActions.indexOf(replacementSortCreateAction),
    );
  });

  it('should run pageLayout updates after pageLayoutTab creates so defaultTabToFocusOnMobileAndSidePanel can reference a tab created in the same migration', () => {
    const pageLayoutUpdateAction = {
      type: 'update',
      metadataName: 'pageLayout',
      universalIdentifier: 'layout',
      update: {
        defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier: 'tab',
      },
    } as unknown as UniversalUpdatePageLayoutAction;
    const pageLayoutTabCreateAction = {
      type: 'create',
      metadataName: 'pageLayoutTab',
      flatEntity: {
        universalIdentifier: 'tab',
        pageLayoutUniversalIdentifier: 'layout',
      },
    } as unknown as UniversalCreatePageLayoutTabAction;

    const orchestratorActionsReport = createEmptyOrchestratorActionsReport();

    orchestratorActionsReport.pageLayout.update.push(pageLayoutUpdateAction);
    orchestratorActionsReport.pageLayoutTab.create.push(
      pageLayoutTabCreateAction,
    );

    const orderedActions = computeOrderedMigrationActions(
      orchestratorActionsReport,
    );

    expect(orderedActions.indexOf(pageLayoutTabCreateAction)).toBeLessThan(
      orderedActions.indexOf(pageLayoutUpdateAction),
    );
  });

  it('should run pageLayout creates before pageLayoutTab creates', () => {
    const pageLayoutCreateAction = {
      type: 'create',
      metadataName: 'pageLayout',
      flatEntity: { universalIdentifier: 'layout' },
    } as unknown as UniversalCreatePageLayoutAction;
    const pageLayoutTabCreateAction = {
      type: 'create',
      metadataName: 'pageLayoutTab',
      flatEntity: {
        universalIdentifier: 'tab',
        pageLayoutUniversalIdentifier: 'layout',
      },
    } as unknown as UniversalCreatePageLayoutTabAction;

    const orchestratorActionsReport = createEmptyOrchestratorActionsReport();

    orchestratorActionsReport.pageLayout.create.push(pageLayoutCreateAction);
    orchestratorActionsReport.pageLayoutTab.create.push(
      pageLayoutTabCreateAction,
    );

    const orderedActions = computeOrderedMigrationActions(
      orchestratorActionsReport,
    );

    expect(orderedActions.indexOf(pageLayoutCreateAction)).toBeLessThan(
      orderedActions.indexOf(pageLayoutTabCreateAction),
    );
  });

  // A child repointed onto another parent is lost to ON DELETE CASCADE when its
  // old parent is deleted first: the update then matches nothing and still
  // reports success. Non-deferrable FKs also need their target created first.
  it.each<{
    title: string;
    earlier: [AllMetadataName, WorkspaceMigrationActionType];
    later: [AllMetadataName, WorkspaceMigrationActionType];
  }>([
    {
      title: 'viewFilterGroup creates before viewFilter updates',
      earlier: ['viewFilterGroup', 'create'],
      later: ['viewFilter', 'update'],
    },
    {
      title: 'viewFilter updates before viewFilterGroup deletes',
      earlier: ['viewFilter', 'update'],
      later: ['viewFilterGroup', 'delete'],
    },
    {
      title: 'viewFilterGroup updates before viewFilterGroup deletes',
      earlier: ['viewFilterGroup', 'update'],
      later: ['viewFilterGroup', 'delete'],
    },
    {
      title: 'pageLayout creates before commandMenuItem creates',
      earlier: ['pageLayout', 'create'],
      later: ['commandMenuItem', 'create'],
    },
    {
      title: 'commandMenuItem updates before pageLayout deletes',
      earlier: ['commandMenuItem', 'update'],
      later: ['pageLayout', 'delete'],
    },
    {
      title: 'pageLayoutWidget updates before pageLayoutTab deletes',
      earlier: ['pageLayoutWidget', 'update'],
      later: ['pageLayoutTab', 'delete'],
    },
    {
      title: 'pageLayoutWidget updates before pageLayout deletes',
      earlier: ['pageLayoutWidget', 'update'],
      later: ['pageLayout', 'delete'],
    },
    {
      title: 'navigationMenuItem updates before navigationMenuItem deletes',
      earlier: ['navigationMenuItem', 'update'],
      later: ['navigationMenuItem', 'delete'],
    },
    {
      title:
        'rowLevelPermissionPredicateGroup creates before rowLevelPermissionPredicate updates',
      earlier: ['rowLevelPermissionPredicateGroup', 'create'],
      later: ['rowLevelPermissionPredicate', 'update'],
    },
    {
      title:
        'rowLevelPermissionPredicate updates before rowLevelPermissionPredicateGroup deletes',
      earlier: ['rowLevelPermissionPredicate', 'update'],
      later: ['rowLevelPermissionPredicateGroup', 'delete'],
    },
    {
      title:
        'rowLevelPermissionPredicateGroup updates before rowLevelPermissionPredicateGroup deletes',
      earlier: ['rowLevelPermissionPredicateGroup', 'update'],
      later: ['rowLevelPermissionPredicateGroup', 'delete'],
    },
  ])('should run $title', ({ earlier, later }) => {
    const orchestratorActionsReport = createEmptyOrchestratorActionsReport();
    const [earlierAction, laterAction] = [earlier, later].map(
      ([metadataName, actionType]) => {
        const sentinel = { type: actionType, metadataName };

        (orchestratorActionsReport[metadataName][actionType] as object[]).push(
          sentinel,
        );

        return sentinel;
      },
    );

    const orderedActions = computeOrderedMigrationActions(
      orchestratorActionsReport,
    ) as object[];

    expect(orderedActions.indexOf(earlierAction)).toBeLessThan(
      orderedActions.indexOf(laterAction),
    );
  });

  // The ordered list is written by hand and OrchestratorActionsReport is a
  // mapped type, so reading fewer keys than it holds type-checks: a metadata
  // name left out here has its actions built, validated, then silently dropped
  // before the runner ever sees them.
  it('should emit the actions of every metadata name', () => {
    const orchestratorActionsReport = createEmptyOrchestratorActionsReport();
    const sentinelByKey = new Map<string, object>();

    for (const metadataName of Object.values(ALL_METADATA_NAME)) {
      for (const actionType of ['create', 'update', 'delete'] as const) {
        const sentinel = { type: actionType, metadataName };

        sentinelByKey.set(`${metadataName}.${actionType}`, sentinel);
        (orchestratorActionsReport[metadataName][actionType] as object[]).push(
          sentinel,
        );
      }
    }

    const orderedActions = computeOrderedMigrationActions(
      orchestratorActionsReport,
    );

    const droppedKeys = [...sentinelByKey.entries()]
      .filter(([, sentinel]) => !orderedActions.includes(sentinel as never))
      .map(([key]) => key);

    expect(droppedKeys).toEqual([]);
  });
});
