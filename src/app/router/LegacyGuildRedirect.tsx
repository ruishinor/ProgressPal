import { Navigate, useLocation } from 'react-router-dom';

export function LegacyGuildRedirect({ to }: { to: string }) {
  const { search, hash, state } = useLocation();
  return <Navigate replace to={{ pathname: to, search, hash }} state={state} />;
}
