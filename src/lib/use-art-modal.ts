'use client';

import { useEffect, useRef, type RefObject } from 'react';

/** Keeps keyboard navigation inside a full-screen art modal and restores its opener. */
export function useArtModal(element: RefObject<HTMLElement | null>, onClose: () => void) {
    const closeCallback = useRef(onClose);
    useEffect(() => { closeCallback.current = onClose; }, [onClose]);
    useEffect(() => {
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const root = element.current;
        root?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            // A purchase can disable its own focused button and move focus to body.
            // Keep ownership even then; nested dialogs handle their own keys.
            const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
            if (dialogs.item(dialogs.length - 1) !== root) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeCallback.current();
            }
            if (event.key !== 'Tab' || !root) return;
            const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter((node) => node.getClientRects().length > 0);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (!first) { event.preventDefault(); return; }
            if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement) || document.activeElement === root)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement) || document.activeElement === root)) {
                event.preventDefault(); first.focus();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            if (previous?.isConnected) previous.focus();
        };
    }, [element]);
}
