import { Outlet } from 'react-router-dom';

import { useAppState } from '@/lib/appState';

function RouteSubtree() {
  return <Outlet />;
}

export function DataEpochOutlet() {
  const { dataEpoch } = useAppState();

  return <RouteSubtree key={`local-data-${dataEpoch}`} />;
}
