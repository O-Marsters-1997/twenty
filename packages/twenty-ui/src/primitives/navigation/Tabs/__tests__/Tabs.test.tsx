import { type ReactNode } from 'react';

import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { Tabs } from '../Tabs';

const RootWrapper = ({ children }: { children: ReactNode }) => (
  <Tabs.Root defaultValue="overview">{children}</Tabs.Root>
);

const ListWrapper = ({ children }: { children: ReactNode }) => (
  <RootWrapper>
    <Tabs.List aria-label="Details">{children}</Tabs.List>
  </RootWrapper>
);

const IndicatorWrapper = ({ children }: { children: ReactNode }) => (
  <ListWrapper>
    <Tabs.Tab value="overview">Overview</Tabs.Tab>
    {children}
  </ListWrapper>
);

runComponentConformance({
  name: 'Tabs.Root',
  element: <Tabs.Root />,
  refInstanceOf: HTMLDivElement,
  renderPropTagName: 'div',
});

runComponentConformance({
  name: 'Tabs.List',
  element: <Tabs.List aria-label="Details" />,
  refInstanceOf: HTMLDivElement,
  renderPropTagName: 'div',
  wrapper: RootWrapper,
});

runComponentConformance({
  name: 'Tabs.Tab',
  element: <Tabs.Tab value="overview">Overview</Tabs.Tab>,
  refInstanceOf: HTMLButtonElement,
  renderPropTagName: 'button',
  wrapper: ListWrapper,
});

runComponentConformance({
  name: 'Tabs.Panel',
  element: <Tabs.Panel value="overview">Overview content</Tabs.Panel>,
  refInstanceOf: HTMLDivElement,
  renderPropTagName: 'div',
  wrapper: RootWrapper,
});

runComponentConformance({
  name: 'Tabs.Indicator',
  element: <Tabs.Indicator />,
  refInstanceOf: HTMLSpanElement,
  renderPropTagName: 'span',
  wrapper: IndicatorWrapper,
});
