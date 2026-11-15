import { type ReactNode } from 'react';

import { runComponentConformance } from '@test-utilities/conformance/runComponentConformance';
import { ToastProvider } from '@ui/components/feedback/Toast/ToastProvider';

import { Toaster } from '../Toaster';

const ToastWrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

runComponentConformance({
  name: 'Toaster',
  element: <Toaster />,
  wrapper: ToastWrapper,
  refInstanceOf: HTMLDivElement,
});
