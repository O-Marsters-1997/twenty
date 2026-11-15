import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { Checkbox } from '../Checkbox';

runComponentConformance({
  name: 'Checkbox',
  element: <Checkbox aria-label="Select item" />,
  refInstanceOf: HTMLSpanElement,
});
