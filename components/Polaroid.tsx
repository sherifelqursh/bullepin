import { type ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type Props = {
  children: ReactNode;
  rotate?: number;
  delay?: number;
  tape?: boolean;
};

export function Polaroid({
  children,
  rotate = -2,
  delay = 0,
  tape = true,
}: Props) {
  // Outer Animated.View owns the layout animation only (no `transform`).
  // Inner View owns the static rotate so Reanimated doesn't clobber it.
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(14).stiffness(320).mass(0.5)}>
      <View
        style={{
          backgroundColor: "#FFFFFF",
          padding: 12,
          borderRadius: 14,
          transform: [{ rotate: `${rotate}deg` }],
          shadowColor: "#A63A2F",
          shadowOpacity: 0.13,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 5,
        }}
      >
        {tape && (
          <View
            style={{
              position: "absolute",
              top: -10,
              left: "30%",
              width: 64,
              height: 18,
              backgroundColor: "#F9DCC4",
              opacity: 0.95,
              borderRadius: 3,
              transform: [{ rotate: "-3deg" }],
            }}
          />
        )}
        {children}
      </View>
    </Animated.View>
  );
}
