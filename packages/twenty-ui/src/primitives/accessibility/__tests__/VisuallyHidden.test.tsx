import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { VisuallyHidden } from '../components/VisuallyHidden';

runComponentConformance({
  name: 'VisuallyHidden',
  element: <VisuallyHidden>Supporting text</VisuallyHidden>,
  refInstanceOf: HTMLSpanElement,
  renderPropTagName: 'div',
});
