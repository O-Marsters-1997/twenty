import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { userEvent, within } from 'storybook/test';

import { DragSelect } from '@/ui/utilities/drag-select/components/DragSelect';
import { ScrollWrapper } from '@/ui/utilities/scroll/components/ScrollWrapper';
import { isDefined } from 'twenty-shared/utils';
import { ComponentDecorator } from 'twenty-ui/testing';
import * as stylex from '@stylexjs/stylex';
import {
  background,
  borderColor,
  borderRadius,
  color,
  spacing,
} from 'twenty-ui/theme/tokens.stylex';

const styles = stylex.create({
  container: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    height: '400px',
    overflow: 'hidden',
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    position: 'relative',
    width: '600px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: spacing['--t-spacing-2'],
    width: '100%',
    height: '100%',
  },
  largeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: spacing['--t-spacing-2'],
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    width: '900px',
    height: '600px',
  },
  selectableItem: {
    alignItems: 'center',
    backgroundColor: {
      default: background['--t-background-secondary'],
      ':hover': background['--t-background-tertiary'],
    },
    borderColor: borderColor['--t-border-color-medium'],
    borderStyle: 'solid',
    borderWidth: '1px',
    borderTopLeftRadius: borderRadius['--t-border-radius-sm'],
    borderTopRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomRightRadius: borderRadius['--t-border-radius-sm'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-sm'],
    cursor: 'pointer',
    display: 'flex',
    height: '80px',
    justifyContent: 'center',
    marginTop: spacing['--t-spacing-1'],
    marginRight: spacing['--t-spacing-1'],
    marginBottom: spacing['--t-spacing-1'],
    marginLeft: spacing['--t-spacing-1'],
    userSelect: 'none',
    width: '100px',
  },
  selectableItemSelected: {
    backgroundColor: {
      default: color['--t-color-blue3'],
      ':hover': color['--t-color-blue5'],
    },
  },
  scrollContent: {
    paddingTop: spacing['--t-spacing-4'],
    paddingRight: spacing['--t-spacing-4'],
    paddingBottom: spacing['--t-spacing-4'],
    paddingLeft: spacing['--t-spacing-4'],
    position: 'relative',
  },
  scrollableWrapperContainer: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: borderColor['--t-border-color-light'],
    borderTopLeftRadius: borderRadius['--t-border-radius-md'],
    borderTopRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomRightRadius: borderRadius['--t-border-radius-md'],
    borderBottomLeftRadius: borderRadius['--t-border-radius-md'],
    height: '300px',
    width: '600px',
    overflow: 'hidden',
  },
});

type SelectableItemProps = {
  id: string;
  selected: boolean;
  children: React.ReactNode;
};

const SelectableItem = ({ id, selected, children }: SelectableItemProps) => (
  <div
    data-selectable-id={id}
    {...stylex.props(
      styles.selectableItem,
      selected && styles.selectableItemSelected,
    )}
  >
    {children}
  </div>
);

type BasicDragSelectDemoProps = {
  itemCount?: number;
  disableSelection?: boolean;
};

const BasicDragSelectDemo = ({
  itemCount = 12,
  disableSelection = false,
}: BasicDragSelectDemoProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  return (
    <div ref={containerRef} {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.grid)}>
        {Array.from({ length: itemCount }, (_, index) => (
          <SelectableItem
            key={index}
            id={`item-${index}`}
            selected={selectedItems.has(`item-${index}`)}
          >
            Item {index + 1}
          </SelectableItem>
        ))}
      </div>

      {!disableSelection && (
        <DragSelect
          selectableItemsContainerRef={containerRef}
          onDragSelectionChange={handleSelectionChange}
          onDragSelectionStart={() => {}}
          onDragSelectionEnd={() => {}}
        />
      )}
    </div>
  );
};

const ScrollableDragSelectDemo = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const handleSelectionChange = (id: string, selected: boolean) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  return (
    <div {...stylex.props(styles.scrollableWrapperContainer)}>
      <ScrollWrapper componentInstanceId="scrollable-demo">
        <div ref={containerRef} {...stylex.props(styles.scrollContent)}>
          <div {...stylex.props(styles.largeGrid)}>
            {Array.from({ length: 36 }, (_, index) => (
              <SelectableItem
                key={index}
                id={`scroll-item-${index}`}
                selected={selectedItems.has(`scroll-item-${index}`)}
              >
                Item {index + 1}
              </SelectableItem>
            ))}
          </div>

          <DragSelect
            selectableItemsContainerRef={containerRef}
            onDragSelectionChange={handleSelectionChange}
          />
        </div>
      </ScrollWrapper>
    </div>
  );
};

const meta: Meta<typeof DragSelect> = {
  title: 'UI/Utilities/DragSelect/DragSelect',
  component: DragSelect,
  decorators: [ComponentDecorator],
  parameters: {
    docs: {
      description: {
        component: `
The DragSelect component enables users to select multiple items by dragging a selection box.

**Key Features:**
- Mouse-based drag selection with visual feedback
- Intersection detection for item selection
- Auto-scroll support for large containers (when used with ScrollWrapper)
- Configurable selection boundaries
- Integration with selectable items via data attributes
- Universal compatibility - works with or without ScrollWrapper

**Usage:**
- Items must have \`data-selectable-id\` attribute
- Use \`data-select-disable="true"\` to disable selection on specific elements
- For auto-scroll functionality, render inside a ScrollWrapper
- Can work without ScrollWrapper for basic drag selection (auto-scroll gracefully disabled)
        `,
      },
    },
  },
  argTypes: {
    selectableItemsContainerRef: { control: false },
    onDragSelectionChange: { control: false },
    onDragSelectionStart: { control: false },
    onDragSelectionEnd: { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof DragSelect>;

export const Default: Story = {
  render: () => <BasicDragSelectDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Basic drag selection with a grid of selectable items. Works without ScrollWrapper - drag selection is universal and can work in any container.',
      },
    },
  },
};

export const WithAutoScroll: Story = {
  render: () => <ScrollableDragSelectDemo />,
  parameters: {
    docs: {
      description: {
        story:
          'Drag selection with auto-scroll support. The container will automatically scroll when dragging near the edges. Uses ScrollWrapper for auto-scroll functionality.',
      },
    },
  },
};

export const InteractiveDragSelection: Story = {
  render: () => <BasicDragSelectDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByText('Item 1');

    const container = canvasElement
      .querySelector('[data-selectable-id="item-0"]')
      ?.closest('div');

    if (isDefined(container)) {
      await userEvent.pointer([
        { target: container, coords: { x: 50, y: 50 } },
        { keys: '[MouseLeft>]', coords: { x: 50, y: 50 } },
        { coords: { x: 200, y: 150 } },
        { keys: '[/MouseLeft]' },
      ]);
    }
  },
  parameters: {
    docs: {
      description: {
        story:
          'Automated interaction test showing drag selection behavior. Watch as items get selected during the drag operation.',
      },
    },
  },
};

export const Disabled: Story = {
  render: () => <BasicDragSelectDemo disableSelection={true} />,
  parameters: {
    docs: {
      description: {
        story:
          'Component without drag selection enabled. Items are displayed but cannot be selected via dragging.',
      },
    },
  },
};
