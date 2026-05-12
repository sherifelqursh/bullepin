import { View } from "react-native";
import { Avatar } from "./Avatar";

type Props = {
  name: string;
  url?: string | null;
  size?: number;
  ringColor?: string;
  ringWidth?: number;
  gap?: number;
  gapColor?: string;
};

/**
 * Avatar wrapped in a colored ring with a small visible gap between
 * the ring and the avatar — gives a "halo" feel.
 */
export function RingAvatar({
  name,
  url,
  size = 56,
  ringColor = "#A63A2F",
  ringWidth = 2.5,
  gap = 3,
  gapColor = "#FFF8F5",
}: Props) {
  return (
    <View
      style={{
        padding: gap,
        borderRadius: 999,
        borderWidth: ringWidth,
        borderColor: ringColor,
        backgroundColor: gapColor,
      }}
    >
      <Avatar name={name} url={url} size={size} />
    </View>
  );
}
