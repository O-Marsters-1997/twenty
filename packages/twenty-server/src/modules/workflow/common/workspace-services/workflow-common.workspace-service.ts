import { Injectable } from '@nestjs/common';

import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import {
  type ObjectMetadataInfo,
  WorkflowMetadataReadService,
} from 'src/modules/workflow/common/workspace-services/workflow-metadata-read.workspace-service';

export type { ObjectMetadataInfo };

@Injectable()
export class WorkflowCommonWorkspaceService {
  constructor(
    private readonly workflowMetadataReadService: WorkflowMetadataReadService,
  ) {}

  async getFlatEntityMaps(workspaceId: string): Promise<{
    flatObjectMetadataMaps: FlatEntityMaps<FlatObjectMetadata>;
    flatFieldMetadataMaps: FlatEntityMaps<FlatFieldMetadata>;
    objectIdByNameSingular: Record<string, string>;
  }> {
    return this.workflowMetadataReadService.getFlatEntityMaps(workspaceId);
  }

  async getObjectMetadataInfo(
    objectNameSingular: string,
    workspaceId: string,
  ): Promise<ObjectMetadataInfo> {
    return this.workflowMetadataReadService.getObjectMetadataInfo(
      objectNameSingular,
      workspaceId,
    );
  }
}
