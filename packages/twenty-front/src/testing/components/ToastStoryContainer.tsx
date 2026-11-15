import { AppToaster } from '@/ui/feedback/toast/components/AppToaster';
import { useState, type ReactNode } from 'react';
import '~/third-party-styles/toast-story-container.css';

type ToastStoryContainerProps = {
  children: ReactNode;
};

export const ToastStoryContainer = ({ children }: ToastStoryContainerProps) => {
  const [toastContainer, setToastContainer] = useState<HTMLDivElement | null>(
    null,
  );

  return (
    <div ref={setToastContainer} data-toast-story-container>
      <AppToaster container={toastContainer} />
      {children}
    </div>
  );
};
