/* @license Enterprise */

import { t } from '@lingui/core/macro';
import { Section } from 'twenty-ui/components/layout';

import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { SettingsRolePermissionsObjectLevelRecordLevelPermissionFilterBuilder } from '@/settings/roles/role-permissions/object-level-permissions/record-level-permissions/components/SettingsRolePermissionsObjectLevelRecordLevelPermissionFilterBuilder';
import * as stylex from '@stylexjs/stylex';
import { spacing } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  content: {
    paddingBottom: spacing['--t-spacing-2'],
  },
});

type SettingsRolePermissionsObjectLevelRecordLevelSectionProps = {
  objectMetadataItem: EnrichedObjectMetadataItem;
  roleId: string;
};

export const SettingsRolePermissionsObjectLevelRecordLevelSection = ({
  objectMetadataItem,
  roleId,
}: SettingsRolePermissionsObjectLevelRecordLevelSectionProps) => (
  <Section.Root>
    <Section.Header
      title={t`Record-level`}
      description={t`Ability to filter the records a user can interact with.`}
    />
    <div {...stylex.props(styles.content)}>
      <SettingsRolePermissionsObjectLevelRecordLevelPermissionFilterBuilder
        roleId={roleId}
        objectMetadataItem={objectMetadataItem}
      />
    </div>
  </Section.Root>
);
