import { forwardRef } from "react";
import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  pressScale?: number;
  style?: ViewStyle | ViewStyle[];
};

const EASE_OUT = Easing.out(Easing.cubic);
// Classic spring config — visible bounce on release.
// damping ↓ = bouncier; stiffness ↑ = faster.
const RELEASE_SPRING = { damping: 14, stiffness: 320, mass: 0.5 } as const;

export const AnimatedPressable = forwardRef<any, Props>(function AnimatedPressable(
  { pressScale = 0.97, onPressIn, onPressOut, style, children, ...rest },
  ref
) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableBase
      ref={ref}
      onPressIn={(e) => {
        scale.value = withTiming(pressScale, { duration: 90, easing: EASE_OUT });
        opacity.value = withTiming(0.92, { duration: 80, easing: EASE_OUT });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, RELEASE_SPRING);
        opacity.value = withTiming(1, { duration: 140, easing: EASE_OUT });
        onPressOut?.(e);
      }}
      style={[animatedStyle as any, style as any]}
      {...rest}
    >
      {children as any}
    </AnimatedPressableBase>
  );
});
