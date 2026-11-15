import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { FormProviderDecorator } from '~/testing/decorators/FormProviderDecorator';
import { IconsProviderDecorator } from '~/testing/decorators/IconsProviderDecorator';
import { MemoryRouterDecorator } from '~/testing/decorators/MemoryRouterDecorator';

import { SettingsDataModelObjectAboutForm } from '@/settings/data-model/objects/forms/components/SettingsDataModelObjectAboutForm';
import { isAdvancedModeEnabledState } from '@/ui/navigation/navigation-drawer/states/isAdvancedModeEnabledState';
import { jotaiStore } from '@/ui/utilities/state/jotai/jotaiStore';
import { ComponentDecorator } from 'twenty-ui/testing';
import { getTestEnrichedObjectMetadataItemsMock } from '~/testing/utils/getTestEnrichedObjectMetadataItemsMock';
import * as stylex from '@stylexjs/stylex';

const mockedCompanyObjectMetadataItem =
  getTestEnrichedObjectMetadataItemsMock().find(
    (item) => item.nameSingular === 'company',
  );

const styles = stylex.create({
  container: {
    flex: '1',
  },
});

const meta: Meta<typeof SettingsDataModelObjectAboutForm> = {
  title:
    'Modules/Settings/DataModel/Objects/Forms/SettingsDataModelObjectAboutForm',
  component: SettingsDataModelObjectAboutForm,
  decorators: [
    (Story) => (
      <div {...stylex.props(styles.container)}>
        <Story />
      </div>
    ),
    FormProviderDecorator,
    IconsProviderDecorator,
    ComponentDecorator,
    MemoryRouterDecorator,
  ],
  parameters: {
    container: { width: 520 },
  },
  beforeEach: () => {
    jotaiStore.set(isAdvancedModeEnabledState.atom, true);

    return () => {
      jotaiStore.set(isAdvancedModeEnabledState.atom, false);
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(() => {
      expect(canvas.getByText('API Name (Singular)')).toBeVisible();
      expect(canvas.getByText('API Name (Plural)')).toBeVisible();
    });
  },
};

export default meta;
type Story = StoryObj<typeof SettingsDataModelObjectAboutForm>;

export const Default: Story = {};

export const WithDefaultValues: Story = {
  args: {
    objectMetadataItem: mockedCompanyObjectMetadataItem,
  },
};
