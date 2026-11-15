import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { Callout } from '../Callout';

runComponentConformance({
  name: 'Callout.Action',
  element: <Callout.Action>Retry sync</Callout.Action>,
  refInstanceOf: HTMLButtonElement,
});
