import { getWidgetHeaderActionDefinition } from '@/page-layout/widgets/utils/getWidgetHeaderActionDefinition';
import {
  FieldDisplayMode,
  WidgetConfigurationType,
  WidgetType,
} from '~/generated-metadata/graphql';

describe('getWidgetHeaderActionDefinition', () => {
  it('returns the registered action component for a built-in widget', () => {
    const definition = getWidgetHeaderActionDefinition({
      type: WidgetType.FIELD,
      configuration: {
        __typename: 'FieldConfiguration',
        configurationType: WidgetConfigurationType.FIELD,
        fieldMetadataId: 'field-metadata-id',
        fieldDisplayMode: FieldDisplayMode.FIELD,
      },
    });

    expect(definition?.Component).toBeDefined();
  });

  it('returns no action for an actionless widget', () => {
    const definition = getWidgetHeaderActionDefinition({
      type: WidgetType.IFRAME,
      configuration: {
        __typename: 'IframeConfiguration',
        configurationType: WidgetConfigurationType.IFRAME,
        url: 'https://example.com',
      },
    });

    expect(definition).toBeUndefined();
  });
});
