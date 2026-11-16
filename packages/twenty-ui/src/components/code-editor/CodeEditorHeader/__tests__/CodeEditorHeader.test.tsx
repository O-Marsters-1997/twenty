import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';

import { CodeEditorHeader } from '../CodeEditorHeader';

runComponentConformance({
  name: 'CodeEditorHeader',
  element: <CodeEditorHeader title="workspace.json" />,
  refInstanceOf: HTMLDivElement,
  renderPropTagName: 'header',
});
