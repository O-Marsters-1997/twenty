import { pointerIntersection } from '@dnd-kit/collision';
import { useDroppable } from '@dnd-kit/react';
import { type ReactNode } from 'react';

import { FIELDS_CONFIGURATION_FIELD_DND_TYPE } from '@/page-layout/widgets/fields/constants/FieldsConfigurationFieldDndType';
import { type FieldsConfigurationFieldListEndDropData } from '@/page-layout/widgets/fields/types/FieldsConfigurationFieldListEndDropData';
import {
  spacing,
  borderColor,
  borderRadius,
  fontColor,
  fontSize,
  color,
} from 'twenty-ui/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';

type FieldsConfigurationEmptyGroupDropZoneProps = {
  groupId: string;
  children: ReactNode;
};

export const FieldsConfigurationEmptyGroupDropZone = ({
  groupId,
  children,
}: FieldsConfigurationEmptyGroupDropZoneProps) => {
  const emptyGroupDropData: FieldsConfigurationFieldListEndDropData = {
    droppableId: groupId,
  };

  const { ref, isDropTarget } = useDroppable({
    id: `fields-configuration-group-${groupId}-empty`,
    accept: FIELDS_CONFIGURATION_FIELD_DND_TYPE,
    collisionDetector: pointerIntersection,
    data: emptyGroupDropData,
  });

  return (
    <div
      ref={ref}
      {...stylex.props(styles.dropZone, isDropTarget && styles.dropTarget)}
    >
      {children}
    </div>
  );
};

const styles = stylex.create({
  dropZone: {
    borderColor: borderColor['--t-border-color-medium'],
    borderRadius: borderRadius['--t-border-radius-sm'],
    borderStyle: 'dashed',
    borderWidth: 1,
    marginBlock: spacing['--t-spacing-1'],
    marginInline: spacing['--t-spacing-2'],
    alignItems: 'center',
    color: fontColor['--t-font-color-light'],
    display: 'flex',
    fontSize: fontSize['--t-font-size-sm'],
    justifyContent: 'center',
    minHeight: spacing['--t-spacing-10'],
  },
  dropTarget: { borderColor: color['--t-color-blue'] },
});
