import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { Toast } from '../Toast';

runComponentConformance({
  name: 'Toast',
  element: <Toast progress={100}>Changes saved</Toast>,
  refInstanceOf: HTMLDivElement,
});
