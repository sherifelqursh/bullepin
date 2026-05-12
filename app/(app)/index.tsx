import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Mail,
  Palette,
  MessageSquare,
  Plus,
  Camera,
  X,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { api, type CircleSummary, type Invitation } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { Avatar } from "../../components/Avatar";
import { RingAvatar } from "../../components/RingAvatar";
import { AppHeader } from "../../components/AppHeader";

function CircleIcon({ kind, color }: { kind: string; color: string }) {
  if (kind === "art") return <Palette color={color} size={28} />;
  if (kind === "chat") return <MessageSquare color={color} size={28} />;
  return <Camera color={color} size={28} />;
}

const ICON_BG: Record<string, string> = {
  art: "#F9DCC4",
  chat: "#FBE4DD",
  camera: "#E2EEF4",
};

function MemberStack({
  members,
  totalCount,
}: {
  members: { id: string; name: string; avatarUrl: string | null }[];
  totalCount: number;
}) {
  const shown = members.slice(0, 2);
  const extra = Math.max(totalCount - shown.length, 0);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {shown.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
          <Avatar name={m.name} url={m.avatarUrl} size={32} bordered />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={{
            paddingHorizontal: 10,
            height: 32,
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
              fontSize: 12,
              color: "#1F1B1A",
            }}
          >
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CirclesHome() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBlurb, setNewBlurb] = useState("");
  const [newIcon, setNewIcon] = useState<"art" | "chat" | "camera">("art");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listCircles();
      setCircles(data.circles);
      setInvitations(data.invitations);
    } catch (err: any) {
      toast.show(err?.message ?? "Couldn't load circles", "error");
    }
  }, [toast]);

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

  const onRespond = async (inv: Invitation, action: "accept" | "decline") => {
    try {
      await api.respondInvite(inv.id, action);
      toast.show(
        action === "accept" ? `Joined ${inv.circleName}` : "Invitation declined",
        "success"
      );
      await load();
    } catch (err: any) {
      toast.show(err?.message ?? "Could not respond", "error");
    }
  };

  const onCreate = async () => {
    if (!newName.trim()) {
      toast.show("Give your Circle a name", "error");
      return;
    }
    setCreating(true);
    try {
      await api.createCircle(
        newName.trim(),
        newBlurb.trim() || undefined,
        newIcon
      );
      setShowStart(false);
      setNewName("");
      setNewBlurb("");
      setNewIcon("art");
      toast.show("Circle created", "success");
      await load();
    } catch (err: any) {
      toast.show(err?.message ?? "Could not create", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title="Circles"
        titleSize={36}
        topPadding={32}
        bottomPadding={22}
        right={
          <AnimatedPressable
            pressScale={0.94}
            onPress={() => router.push("/profile")}
            style={{ borderRadius: 999 }}
          >
            <RingAvatar
              name={user?.name ?? "?"}
              url={user?.avatarUrl}
              size={52}
              ringColor="#A63A2F"
              ringWidth={2.5}
              gap={3}
            />
          </AnimatedPressable>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
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
            {invitations.length > 0 && (
              <Animated.View
                entering={FadeInDown.springify().damping(14).stiffness(320).mass(0.5)}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    fontSize: 32,
                    color: "#1F1B1A",
                    marginBottom: 14,
                  }}
                >
                  Invitations
                </Text>
                {invitations.map((inv, i) => (
                  <Animated.View
                    key={inv.id}
                    entering={FadeInDown.delay(80 * i)
                      .springify().damping(14).stiffness(320).mass(0.5)

}
                    exiting={FadeOut.springify().damping(14).stiffness(320).mass(0.5)}
                    style={{
                      backgroundColor: "rgba(249,220,196,0.55)",
                      padding: 20,
                      marginBottom: 16,
                      borderRadius: 28,
                      borderWidth: 1.5,
                      borderColor: "#E9C9AE",
                      borderStyle: "dashed",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        marginBottom: 14,
                      }}
                    >
                      <View
                        style={{
                          height: 52,
                          width: 52,
                          backgroundColor: "#F9DCC4",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                          borderRadius: 16,
                        }}
                      >
                        <Mail color="#A63A2F" size={24} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: "PlusJakartaSans_500Medium",
                            color: "rgba(31,27,26,0.7)",
                            fontSize: 15,
                          }}
                        >
                          {inv.inviterName} invited you to
                        </Text>
                        <Text
                          style={{
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: "#1F1B1A",
                            fontSize: 26,
                            lineHeight: 30,
                          }}
                        >
                          {inv.circleName}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      <AnimatedPressable
                        onPress={() => onRespond(inv, "accept")}
                        pressScale={0.95}
                        style={{
                          flex: 1,
                          backgroundColor: "#A63A2F",
                          paddingVertical: 13,
                          alignItems: "center",
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: "#FFF8F5",
                            fontSize: 16,
                          }}
                        >
                          Accept
                        </Text>
                      </AnimatedPressable>
                      <AnimatedPressable
                        onPress={() => onRespond(inv, "decline")}
                        pressScale={0.95}
                        style={{
                          flex: 1,
                          backgroundColor: "#E5DDD7",
                          paddingVertical: 13,
                          alignItems: "center",
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "PlusJakartaSans_700Bold",
                            color: "#1F1B1A",
                            fontSize: 16,
                          }}
                        >
                          Decline
                        </Text>
                      </AnimatedPressable>
                    </View>
                  </Animated.View>
                ))}
                <View style={{ height: 8 }} />
              </Animated.View>
            )}

            <Animated.View
              entering={FadeInDown.delay(invitations.length ? 200 : 80)
                .springify().damping(14).stiffness(320).mass(0.5)

}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  fontSize: 32,
                  color: "#1F1B1A",
                  marginBottom: 14,
                }}
              >
                My Circles
              </Text>
            </Animated.View>

            {circles.length === 0 && (
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.6)",
                  fontSize: 15,
                  marginBottom: 14,
                }}
              >
                You're not in any Circles yet. Start one or wait for an invite.
              </Text>
            )}

            {circles.map((c, i) => (
              <Animated.View
                key={c.id}
                entering={FadeInDown.delay(120 + 90 * i)
                  .springify().damping(14).stiffness(320).mass(0.5)

}
              >
                <AnimatedPressable
                  onPress={() => router.push(`/circle/${c.id}/board`)}
                  pressScale={0.985}
                  style={{
                    backgroundColor: "#F4E5DC",
                    padding: 22,
                    marginBottom: 18,
                    borderRadius: 32,
                    shadowColor: "#A63A2F",
                    shadowOpacity: 0.06,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        height: 60,
                        width: 60,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 18,
                        backgroundColor: ICON_BG[c.icon] ?? "#F9DCC4",
                      }}
                    >
                      <CircleIcon kind={c.icon} color="#A63A2F" />
                    </View>
                    {c.joined && (
                      <View
                        style={{
                          backgroundColor: "#A63A2F",
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "PlusJakartaSans_800ExtraBold",
                            color: "#FFF8F5",
                            fontSize: 11,
                            letterSpacing: 1.2,
                          }}
                        >
                          JOINED
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      fontSize: 26,
                      color: "#1F1B1A",
                      marginBottom: 6,
                    }}
                  >
                    {c.name}
                  </Text>
                  {c.blurb && (
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_500Medium",
                        color: "rgba(31,27,26,0.7)",
                        fontSize: 15,
                        lineHeight: 22,
                        marginBottom: 18,
                      }}
                    >
                      {c.blurb}
                    </Text>
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <MemberStack
                      members={c.previewMembers}
                      totalCount={c.memberCount}
                    />
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        color:
                          c.pinCount > 0 ? "#A63A2F" : "rgba(31,27,26,0.5)",
                        fontSize: 14,
                      }}
                    >
                      {c.pinCount > 0
                        ? `${c.pinCount} pin${c.pinCount === 1 ? "" : "s"}`
                        : c.role === "Admin"
                        ? "Admin"
                        : "Member"}
                    </Text>
                  </View>
                </AnimatedPressable>
              </Animated.View>
            ))}

            <Animated.View
              entering={FadeInDown.delay(160 + 90 * circles.length)
                .springify().damping(14).stiffness(320).mass(0.5)

}
            >
              <AnimatedPressable
                onPress={() => setShowStart(true)}
                pressScale={0.985}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 28,
                  marginTop: 4,
                  borderRadius: 32,
                  borderWidth: 1.5,
                  borderColor: "#E5C9B9",
                  borderStyle: "dashed",
                }}
              >
                <View
                  style={{
                    height: 52,
                    width: 52,
                    backgroundColor: "#E5DDD7",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                    borderRadius: 999,
                  }}
                >
                  <Plus color="#1F1B1A" size={24} />
                </View>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    fontSize: 24,
                    color: "#1F1B1A",
                  }}
                >
                  Start a Circle
                </Text>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_500Medium",
                    color: "rgba(31,27,26,0.5)",
                    fontSize: 15,
                    marginTop: 4,
                  }}
                >
                  Gather your people
                </Text>
              </AnimatedPressable>
            </Animated.View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showStart}
        animationType="fade"
        transparent
        onRequestClose={() => setShowStart(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(31,27,26,0.45)",
              justifyContent: "flex-end",
            }}
          >
            <Animated.View
              entering={FadeInUp.springify().damping(14).stiffness(320).mass(0.5)}
              style={{
                backgroundColor: "#FFF8F5",
                padding: 24,
                paddingBottom: 32,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    fontSize: 28,
                    color: "#1F1B1A",
                  }}
                >
                  Start a Circle
                </Text>
                <AnimatedPressable
                  pressScale={0.92}
                  onPress={() => setShowStart(false)}
                >
                  <X color="#1F1B1A" size={24} />
                </AnimatedPressable>
              </View>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#1F1B1A",
                  fontSize: 15,
                  marginBottom: 8,
                }}
              >
                Name
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="The Midnight Society"
                placeholderTextColor="#9C8A80"
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  color: "#1F1B1A",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#F1E2D8",
                }}
              />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#1F1B1A",
                  fontSize: 15,
                  marginBottom: 8,
                }}
              >
                Description
              </Text>
              <TextInput
                value={newBlurb}
                onChangeText={setNewBlurb}
                placeholder="What's this circle about?"
                placeholderTextColor="#9C8A80"
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 16,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  color: "#1F1B1A",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#F1E2D8",
                  minHeight: 84,
                  textAlignVertical: "top",
                }}
              />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#1F1B1A",
                  fontSize: 15,
                  marginBottom: 8,
                }}
              >
                Icon
              </Text>
              <View
                style={{ flexDirection: "row", gap: 12, marginBottom: 22 }}
              >
                {(["art", "chat", "camera"] as const).map((k) => (
                  <AnimatedPressable
                    key={k}
                    onPress={() => setNewIcon(k)}
                    pressScale={0.94}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      paddingVertical: 14,
                      borderRadius: 16,
                      backgroundColor: newIcon === k ? "#F9DCC4" : "#F4E5DC",
                      borderWidth: newIcon === k ? 2 : 0,
                      borderColor: "#A63A2F",
                    }}
                  >
                    <CircleIcon kind={k} color="#A63A2F" />
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_700Bold",
                        fontSize: 12,
                        color: "#1F1B1A",
                        marginTop: 4,
                        textTransform: "capitalize",
                      }}
                    >
                      {k}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
              <AnimatedPressable
                onPress={onCreate}
                disabled={creating}
                pressScale={0.97}
                style={{
                  backgroundColor: "#A63A2F",
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRadius: 999,
                  opacity: creating ? 0.6 : 1,
                  shadowColor: "#A63A2F",
                  shadowOpacity: 0.25,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                {creating ? (
                  <ActivityIndicator color="#FFF8F5" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: "#FFF8F5",
                      fontSize: 18,
                    }}
                  >
                    Start Circle
                  </Text>
                )}
              </AnimatedPressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
