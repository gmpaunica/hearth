import { useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

import { atmo } from './atmoState';

/**
 * Mirror the OS "reduce motion" accessibility setting into the shared atmo
 * state, so Atmosphere/Sparkles can soften the reconciliation glow. On web this
 * tracks the `prefers-reduced-motion` media query via react-native-web.
 */
export function useReduceMotion() {
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (active) atmo.reduceMotion = on;
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) => {
      atmo.reduceMotion = on;
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
}
