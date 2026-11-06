import { type MessageDescriptor } from '@lingui/core';
import { type IconComponent } from 'twenty-ui/icon';

import { type LogConsoleFilterOption } from '@/log-console/types/LogConsoleFilterOption';
import { type FlatApplication } from '@/metadata-store/types/FlatApplication';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { type PartialWorkspaceMember } from '@/settings/roles/types/RoleWithPartialMembers';

export type LogConsoleFilterField = {
  id: string;
  label: MessageDescriptor;
  Icon: IconComponent;
  serverField: string;
  getOptions: (workspace: {
    workspaceMembers: PartialWorkspaceMember[];
    activeObjectMetadataItems: EnrichedObjectMetadataItem[];
    applications: FlatApplication[];
  }) => LogConsoleFilterOption[];
};
