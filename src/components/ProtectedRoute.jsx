import { Outlet } from 'react-router-dom';

// The tracker is open to anyone with the link, so there's nothing to check.
export default function ProtectedRoute() {
  return <Outlet />;
}
