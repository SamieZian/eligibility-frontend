import { useEffect, useRef } from 'react';

/**
 * Modern popover/menu UX: close when the user clicks anywhere outside the
 * referenced element, OR presses Escape.
 *
 * Usage:
 *   const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false));
 *   return <div ref={ref}>{open && <Panel />}</div>;
 */
export function useClickOutside<T extends HTMLElement>(
  active: boolean,
  onOutside: () => void,
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current && !ref.current.contains(target)) {
        onOutside();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOutside();
    };

    // Use capture phase + mousedown so it fires before any click handlers inside
    // the panel itself can run.
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, onOutside]);

  return ref;
}
