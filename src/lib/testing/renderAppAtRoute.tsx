import { render } from '@testing-library/react';

import { App } from '@/app/App';
import { router } from '@/app/router/router';

export async function renderAppAtRoute(route: string) {
  window.history.pushState({}, '', route);
  await router.navigate(route);

  return render(<App />);
}
