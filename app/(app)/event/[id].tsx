import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Clock, MapPin, Pin, Trash2 } from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  api,
  type PinDetail,
  type RsvpEntry,
  type RsvpStatus,
} from "../../../lib/api";
import { useToast } from "../../../lib/toast";
import { resolveImageUrl } from "../../../lib/avatar";
import { AnimatedPressable } from "../../../components/AnimatedPressable";
import { AppHeader } from "../../../components/AppHeader";
import { Avatar } from "../../../components/Avatar";

function RsvpAvatar({ entry, index }: { entry: RsvpEntry; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60)
        .springify()
        .damping(14)
        .stiffness(320)
        .mass(0.5)}
      style={{ marginRight: -10 }}
    >
      <Avatar name={entry.name} url={entry.avatarUrl} size={38} bordered />
    </Animated.View>
  );
}

function RsvpButton({
  label,
  sub,
  selected,
  variant,
  onPress,
  disabled,
  delay,
}: {
  label: string;
  sub: string;
  selected: boolean;
  variant: "yes" | "no" | "maybe";
  onPress: () => void;
  disabled?: boolean;
  delay: number;
}) {
  const palette = {
    yes: { bg: "#A63A2F", text: "#FFF8F5", sub: "#FCE8E2" },
    no: { bg: "#E5DDD7", text: "#1F1B1A", sub: "#7A6E68" },
    maybe: { bg: "#BFD9E8", text: "#1F1B1A", sub: "#3F6F8A" },
  }[variant];

  const scale = useSharedValue(1);
  const elevate = useSharedValue(0);

  // Selected: classic spring — overshoots past 1.02, then settles.
  scale.value = withSpring(selected ? 1.02 : 1, {
    damping: 14,
    stiffness: 320, mass: 0.5,
  });
  elevate.value = withTiming(selected ? 1 : 0, { duration: 200 });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: 0.06 + elevate.value * 0.18,
    shadowRadius: 8 + elevate.value * 18,
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(14).stiffness(320).mass(0.5)}
    >
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled}
        pressScale={0.97}
        style={[
          {
            paddingVertical: 18,
            marginBottom: 14,
            alignItems: "center",
            borderRadius: 999,
            backgroundColor: palette.bg,
            opacity: disabled ? 0.6 : 1,
            shadowColor: "#A63A2F",
            shadowOffset: { width: 0, height: 6 },
          },
          animatedStyle as any,
        ]}
      >
        <Text
          style={{
            fontFamily: "PlusJakartaSans_800ExtraBold",
            fontSize: 26,
            color: palette.text,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: "PlusJakartaSans_500Medium",
            fontSize: 14,
            color: palette.sub,
            marginTop: 2,
          }}
        >
          {sub}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function EventDetail() {
  const { id, cid } = useLocalSearchParams<{ id: string; cid?: string }>();
  const router = useRouter();
  const toast = useToast();
  const [pin, setPin] = useState<PinDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState(false);
  const [deletingPin, setDeletingPin] = useState(false);
  // Once we've resolved the pin once, prefer pin.circleId; otherwise the
  // ?cid=… route param fast-paths Firestore lookups.
  const knownCid = pin?.circleId ?? cid ?? undefined;

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { pin } = await api.getPin(id, cid);
      setPin(pin);
    } catch (err: any) {
      toast.show(err?.message ?? "Couldn't load pin", "error");
    }
  }, [id, cid, toast]);

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

  const onDeletePin = () => {
    if (!pin) return;
    const proceed = async () => {
      setDeletingPin(true);
      try {
        await api.deletePin(pin.id, knownCid);
        toast.show("Pin deleted", "success");
        if (router.canGoBack()) router.back();
        else router.replace(`/circle/${pin.circleId}/board`);
      } catch (err: any) {
        toast.show(err?.message ?? "Could not delete pin", "error");
      } finally {
        setDeletingPin(false);
      }
    };
    const message = `Permanently delete "${pin.title}"? RSVPs and the cover photo will be removed.`;
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" ? window.confirm(message) : true;
      if (ok) proceed();
    } else {
      Alert.alert("Delete pin?", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: proceed },
      ]);
    }
  };

  const onRsvp = async (status: RsvpStatus) => {
    if (!pin) return;
    setRsvping(true);
    try {
      const { pin: updated } = await api.rsvp(pin.id, status, knownCid);
      setPin(updated);
    } catch (err: any) {
      toast.show(err?.message ?? "RSVP failed", "error");
    } finally {
      setRsvping(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color="#A63A2F" size="large" />
        </View>
      </SafeAreaView>
    );
  }
  if (!pin) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <Text style={{ fontSize: 18, textAlign: "center", color: "#1F1B1A" }}>
            Pin not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const cover = resolveImageUrl(pin.coverUrl);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title={pin.circleName}
        titleSize={26}
        topPadding={28}
        showBack
        right={
          pin.canDelete ? (
            <AnimatedPressable
              pressScale={0.88}
              onPress={onDeletePin}
              disabled={deletingPin}
              style={{
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                backgroundColor: "#FBE4DD",
                opacity: deletingPin ? 0.6 : 1,
              }}
            >
              {deletingPin ? (
                <ActivityIndicator color="#A63A2F" />
              ) : (
                <Trash2 color="#A63A2F" size={20} />
              )}
            </AnimatedPressable>
          ) : (
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                color: "rgba(31,27,26,0.6)",
                fontSize: 14,
              }}
            >
              Event Details
            </Text>
          )
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 18, paddingBottom: 60 }}
      >
        <Animated.View
          entering={FadeInDown.springify().damping(14).stiffness(320).mass(0.5)}
          style={{
            backgroundColor: "#FFFFFF",
            padding: 14,
            marginBottom: 20,
            borderRadius: 32,
            shadowColor: "#A63A2F",
            shadowOpacity: 0.1,
            shadowRadius: 22,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: -8,
              left: "30%",
              height: 16,
              width: 90,
              backgroundColor: "#F9DCC4",
              opacity: 0.85,
              borderRadius: 3,
              transform: [{ rotate: "-2deg" }],
              zIndex: 5,
            }}
          />
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{
                width: "100%",
                height: 210,
                borderRadius: 22,
                marginBottom: 18,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                height: 170,
                borderRadius: 22,
                marginBottom: 18,
                backgroundColor: "rgba(249,220,196,0.7)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Pin color="#A63A2F" size={32} fill="#A63A2F" />
            </View>
          )}

          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              color: "#A63A2F",
              fontSize: 38,
              lineHeight: 44,
              textAlign: "center",
              letterSpacing: -1,
              marginBottom: 18,
            }}
          >
            {pin.title}
          </Text>

          <View style={{ alignItems: "center" }}>
            {pin.when && (
              <View
                style={{
                  backgroundColor: "#E2EEF4",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                  borderRadius: 999,
                }}
              >
                <Clock color="#3F6F8A" size={16} />
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: "#1F1B1A",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  {pin.when}
                </Text>
              </View>
            )}
            {pin.where && (
              <View
                style={{
                  backgroundColor: "rgba(249,220,196,0.85)",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 999,
                }}
              >
                <MapPin color="#A63A2F" size={16} />
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: "#1F1B1A",
                    fontSize: 15,
                    marginLeft: 8,
                  }}
                >
                  {pin.where}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {pin.notes && (
          <Animated.View
            entering={FadeIn.delay(160).springify().damping(14).stiffness(320).mass(0.5)}
            style={{ marginBottom: 26, paddingHorizontal: 16 }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                fontStyle: "italic",
                fontSize: 17,
                color: "rgba(31,27,26,0.85)",
                lineHeight: 26,
                textAlign: "center",
              }}
            >
              "{pin.notes}"
            </Text>
          </Animated.View>
        )}

        <RsvpButton
          label="Yes"
          sub="I'm in!"
          variant="yes"
          selected={pin.rsvp === "yes"}
          disabled={rsvping}
          onPress={() => onRsvp("yes")}
          delay={200}
        />
        <RsvpButton
          label="No"
          sub="Can't make it"
          variant="no"
          selected={pin.rsvp === "no"}
          disabled={rsvping}
          onPress={() => onRsvp("no")}
          delay={260}
        />
        <RsvpButton
          label="Maybe"
          sub="Check back later"
          variant="maybe"
          selected={pin.rsvp === "maybe"}
          disabled={rsvping}
          onPress={() => onRsvp("maybe")}
          delay={320}
        />

        <View
          style={{
            marginVertical: 24,
            height: 1,
            backgroundColor: "#EADBCF",
          }}
        />

        {(["yes", "no", "maybe"] as const).map((bucket, bIdx) => {
          const list = pin.rsvps[bucket];
          if (list.length === 0) return null;
          const labels = { yes: "Yes", no: "No", maybe: "Maybe" };
          return (
            <Animated.View
              key={bucket}
              entering={FadeInDown.delay(380 + bIdx * 80).springify().damping(14).stiffness(320).mass(0.5)}
              style={{ marginBottom: 22 }}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: "#1F1B1A",
                  fontSize: 15,
                  marginBottom: 12,
                }}
              >
                {labels[bucket]} ({list.length})
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  paddingLeft: 4,
                  flexWrap: "wrap",
                }}
              >
                {list.map((entry, i) => (
                  <RsvpAvatar key={entry.id} entry={entry} index={i} />
                ))}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
