import { View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { ArrowLeft, LayoutGrid, Settings } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AnimatedPressable } from "./AnimatedPressable";

type Props = {
  active?: "board" | "settings";
  onBack?: () => void;
  boardHref?: string;
  settingsHref?: string;
};

export function BottomNav({ active, onBack, boardHref, settingsHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const computedActive: "board" | "settings" =
    active ??
    (pathname.includes("/settings") || pathname === "/profile"
      ? "settings"
      : "board");

  const goBoard = () => {
    if (boardHref) router.push(boardHref as any);
    else router.replace("/");
  };
  const goSettings = () => {
    if (settingsHref) router.push(settingsHref as any);
    else router.push("/profile");
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 24,
        alignItems: "center",
      }}
    >
      <Animated.View
        entering={FadeInUp.springify().damping(14).stiffness(320).mass(0.5)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.96)",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 999,
          shadowColor: "#A63A2F",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
          borderWidth: 1,
          borderColor: "rgba(241,226,216,0.7)",
        }}
      >
        <AnimatedPressable
          onPress={() => {
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
            else router.replace("/");
          }}
          pressScale={0.9}
          style={{
            height: 50,
            width: 50,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#A63A2F",
            borderRadius: 999,
            shadowColor: "#A63A2F",
            shadowOpacity: 0.35,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
            elevation: 4,
          }}
        >
          <ArrowLeft color="#FFF8F5" size={22} />
        </AnimatedPressable>

        <AnimatedPressable
          onPress={goBoard}
          pressScale={0.9}
          style={{
            height: 50,
            width: 50,
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: 4,
          }}
        >
          <LayoutGrid color="#1F1B1A" size={22} />
          {computedActive === "board" && (
            <View
              style={{
                position: "absolute",
                bottom: 6,
                height: 3,
                width: 22,
                backgroundColor: "#A63A2F",
                borderRadius: 2,
              }}
            />
          )}
        </AnimatedPressable>

        <AnimatedPressable
          onPress={goSettings}
          pressScale={0.9}
          style={{
            height: 50,
            width: 50,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Settings color="#1F1B1A" size={22} />
          {computedActive === "settings" && (
            <View
              style={{
                position: "absolute",
                bottom: 6,
                height: 3,
                width: 22,
                backgroundColor: "#A63A2F",
                borderRadius: 2,
              }}
            />
          )}
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}
