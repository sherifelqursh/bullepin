import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, MapPin, Plus, Pin, Settings, Check, X } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  api,
  type CircleSummary,
  type PinSummary,
  type RsvpEntry,
} from "../../../../lib/api";
import { useToast } from "../../../../lib/toast";
import { resolveImageUrl } from "../../../../lib/avatar";
import { AnimatedPressable } from "../../../../components/AnimatedPressable";
import { AppHeader } from "../../../../components/AppHeader";
import { Avatar } from "../../../../components/Avatar";

const CARD_VARIANTS = [
  { bg: "#FFFFFF", tilt: 0, framed: false },
  { bg: "#F4E5DC", tilt: 0, framed: false },
  { bg: "#FFFFFF", tilt: -1.5, framed: true },
  { bg: "#F9DCC4", tilt: 0, framed: false },
  { bg: "#F4E5DC", tilt: 1.2, framed: false },
];

const RSVP_PALETTE = {
  yes: { bg: "#A63A2F", icon: "#FFF8F5", label: "Yes" },
  no: { bg: "#7A6E68", icon: "#FFF8F5", label: "No" },
  maybe: { bg: "#BFD9E8", icon: "#1F1B1A", label: "Maybe" },
} as const;

function RsvpRow({
  tone,
  count,
  entries,
}: {
  tone: "yes" | "no" | "maybe";
  count: number;
  entries: RsvpEntry[];
}) {
  if (count === 0) return null;
  const palette = RSVP_PALETTE[tone];
  const shown = entries.slice(0, 4);
  const extra = Math.max(count - shown.length, 0);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          backgroundColor: palette.bg,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
        }}
      >
        {tone === "yes" ? (
          <Check color={palette.icon} size={13} />
        ) : tone === "no" ? (
          <X color={palette.icon} size={13} />
        ) : (
          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              color: palette.icon,
              fontSize: 11,
            }}
          >
            ?
          </Text>
        )}
      </View>
      <Text
        style={{
          fontFamily: "PlusJakartaSans_700Bold",
          color: "#1F1B1A",
          fontSize: 13,
          marginRight: 8,
          minWidth: 56,
        }}
      >
        {palette.label} ({count})
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {shown.map((e, i) => (
          <View
            key={e.id}
            style={{ marginLeft: i === 0 ? 0 : -8 }}
          >
            <Avatar name={e.name} url={e.avatarUrl} size={22} bordered />
          </View>
        ))}
        {extra > 0 && (
          <View
            style={{
              paddingHorizontal: 7,
              height: 22,
              marginLeft: 4,
              backgroundColor: "#E5DDD7",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 10,
                color: "#1F1B1A",
              }}
            >
              +{extra}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function PinCard({
  pin,
  index,
  onPress,
}: {
  pin: PinSummary;
  index: number;
  onPress: () => void;
}) {
  const variant = CARD_VARIANTS[index % CARD_VARIANTS.length];
  const isFirst = index === 0;
  const cover = resolveImageUrl(pin.coverUrl);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify().damping(14).stiffness(320).mass(0.5)}
      style={{ marginBottom: 22 }}
    >
      <View style={{ transform: [{ rotate: `${variant.tilt}deg` }] }}>
        <AnimatedPressable
        onPress={onPress}
        pressScale={0.985}
        style={{
          backgroundColor: variant.bg,
          padding: variant.framed ? 14 : 12,
          borderRadius: 28,
          shadowColor: "#A63A2F",
          shadowOpacity: variant.framed ? 0.16 : 0.05,
          shadowRadius: variant.framed ? 18 : 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: variant.framed ? 4 : 2,
        }}
      >
        {variant.framed && (
          <View
            style={{
              position: "absolute",
              top: -6,
              left: 56,
              height: 14,
              width: 56,
              backgroundColor: "#BFD9E8",
              opacity: 0.85,
              borderRadius: 2,
              transform: [{ rotate: "-3deg" }],
              zIndex: 5,
            }}
          />
        )}
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 22,
              marginBottom: 12,
            }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              height: 160,
              borderRadius: 22,
              marginBottom: 12,
              backgroundColor: "rgba(249,220,196,0.7)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pin color="#A63A2F" size={32} fill="#A63A2F" />
          </View>
        )}

        {isFirst && (
          <View
            style={{
              position: "absolute",
              top: 22,
              right: 22,
              backgroundColor: "#F9DCC4",
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 999,
              shadowColor: "#A63A2F",
              shadowOpacity: 0.1,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "#1F1B1A",
                fontSize: 12,
              }}
            >
              New Pin
            </Text>
          </View>
        )}

        <Text
          style={{
            fontFamily: "PlusJakartaSans_800ExtraBold",
            color: "#1F1B1A",
            fontSize: 22,
            marginBottom: 8,
            paddingHorizontal: 4,
          }}
        >
          {pin.title}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            paddingHorizontal: 4,
          }}
        >
          {pin.when && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginRight: 14,
                marginBottom: 4,
              }}
            >
              <Calendar color="#3F6F8A" size={14} />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.7)",
                  fontSize: 14,
                  marginLeft: 4,
                }}
              >
                {pin.when}
              </Text>
            </View>
          )}
          {pin.where && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <MapPin color="#A63A2F" size={14} />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.7)",
                  fontSize: 14,
                  marginLeft: 4,
                }}
              >
                {pin.where}
              </Text>
            </View>
          )}
        </View>
        {pin.rsvpCount > 0 && (
          <View
            style={{
              marginTop: 10,
              paddingHorizontal: 4,
              gap: 6,
            }}
          >
            <RsvpRow
              tone="yes"
              count={pin.rsvps.yes.length}
              entries={pin.rsvps.yes}
            />
            <RsvpRow
              tone="no"
              count={pin.rsvps.no.length}
              entries={pin.rsvps.no}
            />
            <RsvpRow
              tone="maybe"
              count={pin.rsvps.maybe.length}
              entries={pin.rsvps.maybe}
            />
          </View>
        )}
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

export default function CircleBoard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [circle, setCircle] = useState<CircleSummary | null>(null);
  const [pins, setPins] = useState<PinSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [c, b] = await Promise.all([
        api.getCircle(id),
        api.boardForCircle(id),
      ]);
      setCircle(c.circle);
      setPins(b.pins);
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      // Circle was deleted (or we got kicked) — bounce home silently.
      if (/not found|forbidden|not a member/i.test(msg)) {
        if (router.canDismiss()) router.dismissAll();
        router.replace("/");
        return;
      }
      toast.show(msg || "Couldn't load board", "error");
    }
  }, [id, toast, router]);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title={circle?.name ?? "Circle"}
        titleSize={28}
        topPadding={28}
        showBack
        right={
          circle ? (
            <AnimatedPressable
              pressScale={0.9}
              onPress={() => router.push(`/circle/${circle.id}/settings`)}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: "#F4E5DC",
              }}
            >
              <Settings color="#A63A2F" size={22} />
            </AnimatedPressable>
          ) : null
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#A63A2F"
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: "center" }}>
            <ActivityIndicator color="#A63A2F" size="large" />
          </View>
        ) : (
          <>
            <Animated.View
              entering={FadeInDown.springify().damping(14).stiffness(320).mass(0.5)}
            >
              <AnimatedPressable
                onPress={() => id && router.push(`/circle/${id}/new-pin`)}
                pressScale={0.95}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#A63A2F",
                  paddingHorizontal: 22,
                  paddingVertical: 12,
                  marginBottom: 18,
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  shadowColor: "#A63A2F",
                  shadowOpacity: 0.25,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <Plus color="#FFF8F5" size={18} />
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#FFF8F5",
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  Pin to Circle
                </Text>
              </AnimatedPressable>
            </Animated.View>

            {pins.length === 0 ? (
              <Animated.View
                entering={FadeInDown.delay(200).springify().damping(14).stiffness(320).mass(0.5)}
                style={{ paddingVertical: 60, alignItems: "center" }}
              >
                <View
                  style={{
                    height: 64,
                    width: 64,
                    backgroundColor: "#F9DCC4",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                    borderRadius: 999,
                  }}
                >
                  <Pin color="#A63A2F" size={28} fill="#A63A2F" />
                </View>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    fontSize: 22,
                    color: "#1F1B1A",
                  }}
                >
                  No pins yet
                </Text>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: "rgba(31,27,26,0.6)",
                    fontSize: 16,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  Pin the first event for your{"\n"}circle to see.
                </Text>
              </Animated.View>
            ) : (
              pins.map((p, idx) => (
                <PinCard
                  key={p.id}
                  pin={p}
                  index={idx}
                  onPress={() =>
                    router.push(`/event/${p.id}?cid=${circle?.id ?? ""}`)
                  }
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
