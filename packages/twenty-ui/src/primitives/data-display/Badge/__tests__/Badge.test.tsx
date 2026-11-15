import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { Badge } from '../Badge';

runComponentConformance({
  name: 'Badge',
  element: <Badge>Soon</Badge>,
  refInstanceOf: HTMLSpanElement,
  renderPropTagName: 'button',
});
