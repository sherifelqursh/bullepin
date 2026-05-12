import { View, Text } from "react-native";

type Props = { title: string; right?: string };

export function ScreenHeader({ title, right }: Props) {
  return (
    <View className="px-6 pt-2 pb-4 flex-row items-center justify-between border-b border-[#F1E2D8]">
      <Text className="text-primary text-xl font-bold">{title}</Text>
      {right ? (
        <Text className="text-ink/70 text-base">{right}</Text>
      ) : (
        <View />
      )}
    </View>
  );
}
