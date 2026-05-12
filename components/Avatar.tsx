import { useMemo } from "react";
import { View, Image } from "react-native";
import { resolveImageUrl, colorFor } from "../lib/avatar";

type Props = {
  name: string;
  url?: string | null;
  size?: number;
  bordered?: boolean;
  /** Set false to use a flat bg + DiceBear PNG. Default true. */
  illustrated?: boolean;
};

function diceBearUrl(seed: string, size: number) {
  const safe = encodeURIComponent(seed);
  // "lorelei" gives the friendly illustrated look from the references.
  return `https://api.dicebear.com/7.x/lorelei/png?seed=${safe}&size=${Math.round(
    size * 2
  )}&backgroundType=solid&backgroundColor=f9dcc4,bfd9e8,f1c7b6,c9b6e4,a8c4a2,f2c77e`;
}

export function Avatar({
  name,
  url,
  size = 44,
  bordered,
  illustrated = true,
}: Props) {
  const resolved = resolveImageUrl(url);
  const bg = colorFor(name || "x");
  const fallback = useMemo(() => diceBearUrl(name || "friend", size), [name, size]);

  const borderProps = bordered
    ? { borderWidth: 2, borderColor: "#FFF8F5" }
    : {};

  const source = resolved
    ? { uri: resolved }
    : illustrated
    ? { uri: fallback }
    : null;

  if (source) {
    return (
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: bg,
          ...borderProps,
        }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: bg,
        ...borderProps,
      }}
    />
  );
}
