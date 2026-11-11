import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Moves keyboard focus to the page's main landmark whenever the route path
 * changes. An explicitly marked fragment target inside main can take focus
 * for a deep link. Without that target, the initial mount leaves focus alone
 * and later path changes focus main without scrolling.
 *
 * Returns a ref to attach to the shell's <main> element (which must set
 * tabIndex={-1} to be programmatically focusable).
 */
export function useMainContentFocus<T extends HTMLElement>() {
  const { pathname, hash } = useLocation();
  const mainRef = useRef<T | null>(null);
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    const previous = previousPathname.current;
    previousPathname.current = pathname;
    const main = mainRef.current;
    const target = hash ? document.getElementById(hash.slice(1)) : null;
    if (target?.hasAttribute('data-route-focus') && main?.contains(target)) {
      target.focus();
    } else if (previous !== null && previous !== pathname) {
      main?.focus({ preventScroll: true });
    }
  }, [hash, pathname]);

  return mainRef;
}
