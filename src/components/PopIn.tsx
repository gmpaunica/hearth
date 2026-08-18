import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Gentle entrance for cards and sheets: a restrained spring with a fade.
 * Respects reduce-motion (fades only, no scale). Drop-in replacement for a
 * styled <View>.
 */
export function PopIn({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [v] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!active) return;
      if (reduceMotion) {
        v.setValue(1);
        return;
      }
      animation = Animated.spring(v, {
        toValue: 1,
        friction: 9,
        tension: 78,
        useNativeDriver: true,
      });
      animation.start();
    });
    return () => {
      active = false;
      animation?.stop();
    };
  }, [v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            {
              scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
