import { useEffect, useState } from 'react';

/**
 * Hook que detecta la preferencia del usuario para movimiento reducido
 * (WCAG 2.3.3 accessibility requirement)
 * 
 * @returns true si el usuario prefiere movimiento reducido
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Detecta preferencia media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Escucha cambios
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
