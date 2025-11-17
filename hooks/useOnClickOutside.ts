import { useEffect, RefObject } from 'react';

// The event type can be simplified since 'click' covers both mouse and touch taps.
type Event = MouseEvent | TouchEvent;

export const useOnClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: Event) => void
) => {
  useEffect(() => {
    const listener = (event: Event) => {
      const el = ref?.current;
      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    // Using the 'click' event in the capture phase (the `true` argument) is more robust.
    // It handles both mouse clicks and touch taps reliably and prevents race conditions.
    // The capture phase ensures this listener runs before the target's own click listeners
    // in the bubbling phase, giving us more predictable control over closing the dropdown.
    document.addEventListener('click', listener, true);

    return () => {
      document.removeEventListener('click', listener, true);
    };
  }, [ref, handler]); // Reload only if ref or handler changes
};