import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { Switch } from '../Switch';

runComponentConformance({
  name: 'Switch',
  element: <Switch aria-label="Notifications" />,
  refInstanceOf: HTMLSpanElement,
});
