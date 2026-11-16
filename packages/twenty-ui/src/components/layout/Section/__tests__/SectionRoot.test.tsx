import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { Section } from '../Section';

runComponentConformance({
  name: 'Section.Root',
  element: <Section.Root>Workspace settings</Section.Root>,
  refInstanceOf: HTMLDivElement,
  renderPropTagName: 'section',
});
