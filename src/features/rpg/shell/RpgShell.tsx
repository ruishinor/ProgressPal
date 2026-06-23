import { Outlet } from 'react-router-dom';

import { RpgBottomNav } from '@/features/rpg/shell/RpgBottomNav';

export function RpgShell() {
  return (
    <section className="rpg-shell" data-testid="rpg-shell">
      <a className="rpg-shell__skip-link" href="#rpg-main-content">
        Skip to RPG content
      </a>
      <div className="rpg-shell__frame">
        <main className="rpg-shell__main" id="rpg-main-content">
          <Outlet />
        </main>
        <RpgBottomNav />
      </div>
    </section>
  );
}
