import { type Node, type NodeProps } from '@xyflow/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { ObjectMetadataIcon } from '@/object-metadata/components/ObjectMetadataIcon';
import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';
import { isHiddenSystemField } from '@/object-metadata/utils/isHiddenSystemField';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { ObjectFieldRow } from '@/settings/data-model/graph-overview/components/SettingsDataModelOverviewField';
import { FieldMetadataType } from '~/generated-metadata/graphql';

import { SettingsItemTypeTag } from '@/settings/components/SettingsItemTypeTag';
import { ObjectFieldRowWithoutRelation } from '@/settings/data-model/graph-overview/components/SettingsDataModelOverviewFieldWithoutRelation';
import '@xyflow/react/dist/style.css';
import { SettingsPath } from 'twenty-shared/types';
import { getSettingsPath, isDefined } from 'twenty-shared/utils';
import { IconChevronDown, IconChevronUp } from 'twenty-ui/icon';
import { useTheme } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  boxShadow,
  fontColor,
  fontWeight,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

type SettingsDataModelOverviewObjectNode = Node<
  EnrichedObjectMetadataItem,
  'object'
>;
type SettingsDataModelOverviewObjectProps =
  NodeProps<SettingsDataModelOverviewObjectNode>;

const styles = stylex.create({
  node: {
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-2'],
    backgroundColor: background['--t-background-secondary'],
    boxShadow: boxShadow['--t-box-shadow-light'],
    display: 'flex',
    flexDirection: 'column',
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-2'],
    width: '220px',
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  objectName: {
    borderWidth: '0',
    gap: spacing['--t-spacing-1'],
    display: 'flex',
    fontWeight: fontWeight['--t-font-weight-medium'],
    position: 'relative',
    textAlign: 'center',
    borderBottomLeftRadius: '0',
    borderBottomRightRadius: '0',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
  },
  innerCard: {
    borderColor: borderColor['--t-border-color-light'],
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: spacing['--t-spacing-0_5'],
    backgroundColor: background['--t-background-primary'],
    color: fontColor['--t-font-color-tertiary'],
    display: 'flex',
    flexDirection: 'column',
    flexWrap: 'nowrap',
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    paddingBottom: spacing['--t-spacing-2'],
    paddingLeft: '0',
    paddingRight: '0',
    paddingTop: spacing['--t-spacing-2'],
  },
  cardRow: {
    gap: spacing['--t-spacing-1'],
    alignItems: 'center',
    display: 'flex',
    height: '24px',
  },
  cardRowOther: {
    gap: spacing['--t-spacing-2'],
    alignItems: 'center',
    backgroundColor: {
      default: null,
      ':hover': background['--t-background-tertiary'],
    },
    cursor: 'pointer',
    display: 'flex',
    height: '24px',
    paddingBottom: '0',
    paddingLeft: spacing['--t-spacing-2'],
    paddingRight: spacing['--t-spacing-2'],
    paddingTop: '0',
  },
  objectLink: {
    gap: spacing['--t-spacing-1'],
    textDecoration: 'none',
    alignItems: 'center',
    color: {
      default: fontColor['--t-font-color-primary'],
      ':hover': fontColor['--t-font-color-secondary'],
    },
    display: 'flex',
  },
  objectInstanceCount: {
    color: fontColor['--t-font-color-tertiary'],
  },
});

export const SettingsDataModelOverviewObject = ({
  data: objectMetadataItem,
}: SettingsDataModelOverviewObjectProps) => {
  const theme = useTheme();
  const { formatNumber } = useNumberFormat();
  const [otherFieldsExpanded, setOtherFieldsExpanded] = useState(false);

  const { totalCount } = useFindManyRecords({
    objectNameSingular: objectMetadataItem.nameSingular,
  });

  const fields = objectMetadataItem.fields.filter(
    (x) => !isHiddenSystemField(x) && x.isActive,
  );

  const countNonRelation = fields.filter(
    (x) => x.type !== FieldMetadataType.RELATION,
  ).length;

  return (
    <div {...stylex.props(styles.node)}>
      <div {...stylex.props(styles.header)}>
        <div
          onMouseEnter={() => {}}
          onMouseLeave={() => {}}
          {...stylex.props(styles.objectName)}
        >
          <Link
            {...stylex.props(styles.objectLink)}
            to={getSettingsPath(SettingsPath.Objects, {
              objectNamePlural: objectMetadataItem.namePlural,
            })}
          >
            <ObjectMetadataIcon
              objectMetadataItem={objectMetadataItem}
              size={theme.icon.size.md}
            />
            {objectMetadataItem.labelPlural}
          </Link>
          <div {...stylex.props(styles.objectInstanceCount)}>
            {' '}
            · {isDefined(totalCount) ? formatNumber(totalCount) : totalCount}
          </div>
        </div>
        <SettingsItemTypeTag item={objectMetadataItem} />
      </div>

      <div {...stylex.props(styles.innerCard)}>
        {fields
          .filter((x) => x.type === FieldMetadataType.RELATION)
          .map((field) => (
            <div key={field.id} {...stylex.props(styles.cardRow)}>
              <ObjectFieldRow field={field} />
            </div>
          ))}
        {countNonRelation > 0 && (
          <>
            <div
              onClick={() => setOtherFieldsExpanded(!otherFieldsExpanded)}
              {...stylex.props(styles.cardRowOther)}
            >
              {otherFieldsExpanded ? (
                <IconChevronUp size={theme.icon.size.md} />
              ) : (
                <IconChevronDown size={theme.icon.size.md} />
              )}
              <div>{countNonRelation} fields</div>
            </div>
            {otherFieldsExpanded &&
              fields
                .filter((x) => x.type !== FieldMetadataType.RELATION)
                .map((field) => (
                  <div key={field.id} {...stylex.props(styles.cardRow)}>
                    <ObjectFieldRowWithoutRelation field={field} />
                  </div>
                ))}
          </>
        )}
      </div>
    </div>
  );
};
