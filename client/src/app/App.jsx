import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { FullPageLoader } from '../components/FullPageLoader.jsx';
import { router } from './router.jsx';

export function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
