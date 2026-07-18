import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Moves keyboard focus to the page's main landmark whenever the route path
 * changes, matching the skip-link target so keyboard and screen-reader users
 * start each new page from its content. The initial mount is skipped so
 * first load never steals focus; scrolling is left to the shells.
 *
 * Returns a ref to attach to the shell's <main> element (which must set
 * tabIndex={-1} to be programmatically focusable).
 */
export function useMainContentFocus<T extends HTMLElement>() {
  const { pathname } = useLocation();
  const mainRef = useRef<T | null>(null);
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return mainRef;
}
