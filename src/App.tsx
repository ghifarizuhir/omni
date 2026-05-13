import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { CurrentUserProvider } from './lib/rbac/CurrentUserContext';

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <CurrentUserProvider>
      <RouterProvider router={router} />
    </CurrentUserProvider>
  );
}
