import { type ReactNode } from 'react';

import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';
import { RadioGroup } from '@ui/primitives/input/RadioGroup/RadioGroup';

import { Radio } from '../Radio';

const RadioGroupWrapper = ({ children }: { children: ReactNode }) => (
  <RadioGroup>{children}</RadioGroup>
);

runComponentConformance({
  name: 'Radio',
  element: <Radio value="option">Option</Radio>,
  wrapper: RadioGroupWrapper,
  refInstanceOf: HTMLSpanElement,
});

runComponentConformance({
  name: 'RadioGroup',
  element: <RadioGroup />,
  refInstanceOf: HTMLDivElement,
});

runComponentConformance({
  name: 'Radio card',
  element: (
    <Radio variant="card" value="option">
      Option
    </Radio>
  ),
  wrapper: RadioGroupWrapper,
  refInstanceOf: HTMLDivElement,
});
