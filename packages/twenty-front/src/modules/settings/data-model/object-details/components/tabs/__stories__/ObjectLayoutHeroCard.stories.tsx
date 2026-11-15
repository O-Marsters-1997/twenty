import { SettingsDiscoveryHeroCard } from '@/settings/components/SettingsDiscoveryHeroCard';
import { SettingsDiscoveryHeroCardFooter } from '@/settings/components/SettingsDiscoveryHeroCardFooter';
import recordPageLayoutCoverDark from '@/settings/data-model/object-details/assets/record-page-layout-cover-dark.png';
import recordPageLayoutCoverLight from '@/settings/data-model/object-details/assets/record-page-layout-cover-light.png';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { IconAddressBook, IconPencil } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/primitives/input';
import { ThemeProvider } from 'twenty-ui/theme';
import * as stylex from '@stylexjs/stylex';
import { background } from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  canvas: {
    background: background['--t-background-primary'],
    boxSizing: 'border-box',
    paddingTop: '32px',
    paddingRight: '32px',
    paddingBottom: '32px',
    paddingLeft: '32px',
    width: '758px',
  },
});

const meta: Meta = {
  title: 'Modules/Settings/Data Model/Object Layout Hero Card',
};

export default meta;

type Story = StoryObj;

const renderCard = (colorScheme: 'light' | 'dark') => (
  <ThemeProvider colorScheme={colorScheme} applyToRoot={false}>
    <div {...stylex.props(styles.canvas)}>
      <SettingsDiscoveryHeroCard
        lightSrc={recordPageLayoutCoverLight}
        darkSrc={recordPageLayoutCoverDark}
        coverHeight={153}
        instanceIdPrefix={`object-layout-${colorScheme}`}
        tabs={[]}
        footer={
          <SettingsDiscoveryHeroCardFooter
            Icon={IconAddressBook}
            title="Customize record page"
            description="Customize how your record page looks."
            action={
              <Button
                size="sm"
                startIcon={<IconPencil />}
                variant="solid"
                color="accent"
              >
                {'Customize'}
              </Button>
            }
          />
        }
      />
    </div>
  </ThemeProvider>
);

export const Light: Story = {
  render: () => renderCard('light'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText('Customize record page')).toBeVisible();
    expect(
      canvas.getByText('Customize how your record page looks.'),
    ).toBeVisible();
    expect(canvas.getByRole('button', { name: 'Customize' })).toBeEnabled();
  },
};

export const Dark: Story = {
  render: () => renderCard('dark'),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    expect(canvas.getByText('Customize record page')).toBeVisible();
    expect(
      canvas.getByText('Customize how your record page looks.'),
    ).toBeVisible();
    expect(canvas.getByRole('button', { name: 'Customize' })).toBeEnabled();
  },
};
