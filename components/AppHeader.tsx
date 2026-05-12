import { type ReactNode } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { AnimatedPressable } from "./AnimatedPressable";

type Props = {
  title: string;
  /** Show a back arrow on the left. Defaults to false. */
  showBack?: boolean;
  /** Override the back action (defaults to router.back() / replace("/")). */
  onBack?: () => void;
  /** Optional element on the right (gear icon, avatar, etc.). */
  right?: ReactNode;
  /** Title font size. Defaults to 30. */
  titleSize?: number;
  /** Vertical padding above the title. Defaults to 28 — gives breathing room. */
  topPadding?: number;
  /** Padding below the title before the divider. Defaults to 18. */
  bottomPadding?: number;
};

export function AppHeader({
  title,
  showBack,
  onBack,
  right,
  titleSize = 30,
  topPadding = 28,
  bottomPadding = 18,
}: Props) {
  const router = useRouter();
  const fallbackBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: topPadding,
        paddingBottom: bottomPadding,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#F1E2D8",
        minHeight: 80,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
          minHeight: 56,
        }}
      >
        {showBack && (
          <AnimatedPressable
            onPress={onBack ?? fallbackBack}
            pressScale={0.88}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
              marginLeft: -6,
              borderRadius: 999,
            }}
          >
            <ArrowLeft color="#A63A2F" size={26} />
          </AnimatedPressable>
        )}
        <Text
          numberOfLines={1}
          style={{
            fontFamily: "PlusJakartaSans_800ExtraBold",
            color: "#A63A2F",
            fontSize: titleSize,
            letterSpacing: -0.5,
            flex: 1,
          }}
        >
          {title}
        </Text>
      </View>
      {right ? (
        <View style={{ marginLeft: 12, alignItems: "center", justifyContent: "center" }}>
          {right}
        </View>
      ) : null}
    </View>
  );
}
