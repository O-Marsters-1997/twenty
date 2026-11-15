import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { NumberStepper } from '../NumberStepper';

runComponentConformance({
  name: 'NumberStepper',
  element: <NumberStepper aria-label="Quantity" />,
  refInstanceOf: HTMLInputElement,
  renderPropTagName: 'input',
});
