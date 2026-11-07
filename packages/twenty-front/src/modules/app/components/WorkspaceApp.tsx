import { RouterProvider } from 'react-router-dom';

import { AppNavigatorProvider } from '@/app/components/AppNavigatorProvider';
import { useCreateWorkspaceAppRouter } from '@/app/hooks/useCreateWorkspaceAppRouter';

export const WorkspaceApp = () => {
  const router = useCreateWorkspaceAppRouter();

  return (
    <AppNavigatorProvider router={router}>
      <RouterProvider useTransitions={false} router={router} />
    </AppNavigatorProvider>
  );
};
