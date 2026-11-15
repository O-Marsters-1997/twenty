import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';
import { ButtonGroup } from '../ButtonGroup';

runComponentConformance({
  name: 'ButtonGroup',
  element: <ButtonGroup aria-label="Actions" />,
  refInstanceOf: HTMLDivElement,
});
