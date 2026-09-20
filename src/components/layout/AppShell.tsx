import type { PropsWithChildren, Ref } from 'react';
import { NavLink } from 'react-router-dom';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { classNames, type StatusTone } from '@/components/ui/utils';

export type AppShellNavigationItem = {
  end?: boolean;
  id: string;
  label: string;
  to: string;
};

export type AppShellStatusItem = {
  label: string;
  tone?: StatusTone;
  value: string;
};

export type AppShellProps = PropsWithChildren<{
  navigationItems: readonly AppShellNavigationItem[];
  statusItems?: readonly AppShellStatusItem[];
  utilityNavigationItems?: readonly AppShellNavigationItem[];
  summary: string;
  title: string;
}> & {
  brand?: string;
  mainRef?: Ref<HTMLElement>;
};

export function AppShell({
  brand = 'ProgressPal CS50 Edition',
  children,
  mainRef,
  navigationItems,
  statusItems,
  summary,
  title,
  utilityNavigationItems,
}: AppShellProps) {
  return (
    <div className="shell-root">
      <a className="shell-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="shell-header">
        <div className="shell-brand-block">
          <p className="shell-brand">{brand}</p>
          <h1 className="shell-title">{title}</h1>
          <p className="shell-summary">{summary}</p>
        </div>
        {statusItems?.length ? (
          <Card className="shell-status" title="Current status" titleAs="p">
            <dl className="shell-status__list">
              {statusItems.map((item) => (
                <div className="shell-status__item" key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>
                    <Badge tone={item.tone ?? 'neutral'}>{item.value}</Badge>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}
      </header>
      <nav aria-label="Primary" className="shell-nav">
        {navigationItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              classNames(
                'shell-nav__link',
                isActive && 'shell-nav__link--active',
              )
            }
            end={item.end}
            key={item.id}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
        {utilityNavigationItems?.length ? (
          <div className="shell-nav__utility">
            {utilityNavigationItems.map((item) => (
              <NavLink
                className="shell-nav__link shell-nav__link--utility"
                end={item.end}
                key={item.id}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </nav>
      <main
        className="shell-main"
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
