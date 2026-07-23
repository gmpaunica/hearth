import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Bubbly entrance for cards and sheets: a soft spring from 85% scale with a
 * fade. Respects reduce-motion (fades only, no scale). Drop-in replacement for
 * a styled <View>.
 */
export function PopIn({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const v = useRef(new Animated.Value(0)).current;
  const scaleOk = useRef(true);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      scaleOk.current = !on;
    });
    Animated.spring(v, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [v]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            {
              scale: scaleOk.current
                ? v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
                : 1,
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
