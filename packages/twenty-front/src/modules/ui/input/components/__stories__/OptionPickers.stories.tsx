import { DropdownMenuInnerSelect } from '@/ui/layout/dropdown/components/DropdownMenuInnerSelect';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ComponentDecorator } from 'twenty-ui/testing';

const InnerSelectExample = () => {
  const options = [
    { value: 'first', label: 'First' },
    { value: 'disabled', label: 'Disabled', disabled: true },
    { value: 'last', label: 'Last' },
  ];
  const [option, setOption] = useState(options[0]);
  return (
    <DropdownMenuInnerSelect
      dropdownId="inner-select-story"
      aria-label="Position"
      selectedOption={option}
      options={options}
      onChange={setOption}
    />
  );
};

const meta: Meta = {
  title: 'UI/Input/OptionPickers',
  decorators: [ComponentDecorator],
};
export default meta;
type Story = StoryObj;

export const InnerSelectSkipsDisabled: Story = {
  render: () => <InnerSelectExample />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button');
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(trigger);
    expect(await body.findByRole('dialog', { name: 'Position' })).toBeVisible();
    expect(
      await body.findByRole('button', { name: 'Disabled' }),
    ).toBeDisabled();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() =>
      expect(body.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveTextContent('Last');
  },
};
