import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Sparkles,
  MoreVertical,
  Users,
  UserPlus,
  LogOut,
  Crown,
  UserMinus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp, FadeIn } from "react-native-reanimated";
import {
  api,
  type CircleMember,
  type CircleSummary,
} from "../../../../lib/api";
import { useToast } from "../../../../lib/toast";
import { Avatar } from "../../../../components/Avatar";
import { AnimatedPressable } from "../../../../components/AnimatedPressable";
import { AppHeader } from "../../../../components/AppHeader";

function MemberRow({
  member,
  isOwnerRow,
  viewerIsAdmin,
  delay,
  onAction,
}: {
  member: CircleMember;
  isOwnerRow: boolean;
  viewerIsAdmin: boolean;
  delay: number;
  onAction: (m: CircleMember) => void;
}) {
  if (member.isYou) {
    return (
      <Animated.View
        entering={FadeInDown.delay(delay).springify().damping(14).stiffness(320).mass(0.5)}
        style={{
          backgroundColor: "#FFFFFF",
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderRadius: 999,
          borderWidth: 1.6,
          borderColor: "#F4D6BC",
          shadowColor: "#A63A2F",
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Avatar name={member.name} url={member.avatarUrl} size={48} />
          <View style={{ marginLeft: 12 }}>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_800ExtraBold",
                fontSize: 17,
                color: "#1F1B1A",
              }}
            >
              {member.name} (You)
            </Text>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                color: "#3F6F8A",
                fontSize: 14,
              }}
            >
              {member.role}
            </Text>
          </View>
        </View>
        <View
          style={{
            backgroundColor: "#F9DCC4",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              color: "#1F1B1A",
              fontSize: 11,
              letterSpacing: 1.2,
            }}
          >
            YOU
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(14).stiffness(320).mass(0.5)}
      style={{
        backgroundColor: "#F1E2D8",
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: 999,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        <Avatar name={member.name} url={member.avatarUrl} size={48} />
        <View style={{ marginLeft: 12 }}>
          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              fontSize: 17,
              color: "#1F1B1A",
            }}
          >
            {member.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                color: member.role === "Admin" ? "#3F6F8A" : "rgba(31,27,26,0.6)",
                fontSize: 14,
              }}
            >
              {member.role}
            </Text>
            {isOwnerRow && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 8,
                }}
              >
                <Crown color="#A63A2F" size={12} />
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#A63A2F",
                    fontSize: 11,
                    marginLeft: 2,
                  }}
                >
                  OWNER
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      {viewerIsAdmin && !isOwnerRow && (
        <AnimatedPressable
          pressScale={0.85}
          onPress={() => onAction(member)}
          style={{ paddingHorizontal: 8, paddingVertical: 8 }}
        >
          <MoreVertical color="#1F1B1A" size={18} />
        </AnimatedPressable>
      )}
    </Animated.View>
  );
}

export default function CircleSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [circle, setCircle] = useState<CircleSummary | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [actionMember, setActionMember] = useState<CircleMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getCircle(id);
      setCircle(data.circle);
      setMembers(data.members);
      setName(data.circle.name);
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (/not found|forbidden|not a member/i.test(msg)) {
        if (router.canDismiss()) router.dismissAll();
        router.replace("/");
        return;
      }
      toast.show(msg || "Couldn't load circle", "error");
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
  if (!circle) {
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
          <Text style={{ fontSize: 18, color: "#1F1B1A", textAlign: "center" }}>
            Circle not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = circle.role === "Admin";

  const onSaveName = async () => {
    if (!name.trim() || name === circle.name) return;
    setSavingName(true);
    try {
      const { circle: c } = await api.updateCircle(circle.id, {
        name: name.trim(),
      });
      setCircle(c);
      toast.show("Circle name updated", "success");
    } catch (err: any) {
      toast.show(err?.message ?? "Could not save", "error");
    } finally {
      setSavingName(false);
    }
  };

  const onInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.invite(circle.id, inviteEmail.trim());
      setInviteEmail("");
      setShowInvite(false);
      toast.show(`Invite sent to ${inviteEmail.trim()}`, "success");
    } catch (err: any) {
      toast.show(err?.message ?? "Could not invite", "error");
    } finally {
      setInviting(false);
    }
  };

  const onLeave = () => {
    const proceed = async () => {
      try {
        await api.leaveCircle(circle.id);
        toast.show("You left the circle", "success");
        router.replace("/");
      } catch (err: any) {
        toast.show(err?.message ?? "Could not leave", "error");
      }
    };
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined"
          ? window.confirm("Leave this circle? You'll need a new invite to rejoin.")
          : true;
      if (ok) proceed();
    } else {
      Alert.alert("Leave circle?", "You'll need a new invite to rejoin.", [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: proceed },
      ]);
    }
  };

  const onDeleteCircle = () => {
    const proceed = async () => {
      setDeleting(true);
      try {
        await api.deleteCircle(circle.id);
        toast.show(`${circle.name} deleted`, "success");
        // Pop every screen off the stack, then land on home. This clears
        // the board entry in history so a back-swipe doesn't briefly
        // flash the deleted circle.
        if (router.canDismiss()) router.dismissAll();
        router.replace("/");
      } catch (err: any) {
        toast.show(err?.message ?? "Could not delete", "error");
      } finally {
        setDeleting(false);
      }
    };
    const message = `Permanently delete "${circle.name}"? Every pin and RSVP will be erased for all members. This cannot be undone.`;
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" ? window.confirm(message) : true;
      if (ok) proceed();
    } else {
      Alert.alert("Delete circle?", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: proceed },
      ]);
    }
  };

  const onMemberAction = async (
    target: CircleMember,
    action: "promote" | "demote" | "remove"
  ) => {
    setActionMember(null);
    try {
      if (action === "remove") {
        await api.removeMember(circle.id, target.id);
        toast.show(`${target.name} removed`, "success");
      } else {
        await api.setMemberRole(
          circle.id,
          target.id,
          action === "promote" ? "Admin" : "Member"
        );
        toast.show(
          `${target.name} is now a ${action === "promote" ? "Admin" : "Member"}`,
          "success"
        );
      }
      await load();
    } catch (err: any) {
      toast.show(err?.message ?? "Action failed", "error");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title={circle.name}
        titleSize={28}
        topPadding={28}
        showBack
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      >
        <Animated.View
          entering={FadeInDown.springify().damping(14).stiffness(320).mass(0.5)}
          style={{ alignItems: "center", marginTop: 12, marginBottom: 8 }}
        >
          <View
            style={{
              backgroundColor: "rgba(249,220,196,0.85)",
              paddingHorizontal: 18,
              paddingVertical: 6,
              alignSelf: "center",
              marginBottom: 10,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 14,
                color: "#1F1B1A",
              }}
            >
              {circle.role}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              fontSize: 48,
              color: "#1F1B1A",
              letterSpacing: -1,
              textAlign: "center",
            }}
          >
            Circle Settings
          </Text>
          <Text
            style={{
              fontFamily: "PlusJakartaSans_500Medium",
              color: "rgba(31,27,26,0.7)",
              fontSize: 16,
              marginTop: 6,
            }}
          >
            Just the basics for your space.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(14).stiffness(320).mass(0.5)}
          style={{
            backgroundColor: "#F4E5DC",
            padding: 22,
            marginTop: 28,
            marginBottom: 32,
            borderRadius: 32,
            shadowColor: "#A63A2F",
            shadowOpacity: 0.05,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 1,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Sparkles color="#A63A2F" size={22} fill="#A63A2F" />
            <Text
              style={{
                fontFamily: "PlusJakartaSans_800ExtraBold",
                fontSize: 22,
                color: "#1F1B1A",
                marginLeft: 8,
              }}
            >
              Circle Name
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#FFF8F5",
              paddingHorizontal: 16,
              paddingVertical: 14,
              marginBottom: 14,
              borderRadius: 18,
            }}
          >
            <TextInput
              value={name}
              onChangeText={setName}
              editable={isAdmin}
              onBlur={onSaveName}
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 17,
                color: "#1F1B1A",
                borderBottomWidth: 1.4,
                borderBottomColor: "#E9C9AE",
                paddingBottom: 6,
              }}
            />
          </View>

          <Text
            style={{
              fontFamily: "PlusJakartaSans_500Medium",
              fontStyle: "italic",
              color: "rgba(31,27,26,0.65)",
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            {isAdmin
              ? "Only you and any other admins can change the Circle name."
              : "Only the Circle Creator can change this name."}
          </Text>
          {isAdmin && savingName && (
            <ActivityIndicator
              color="#A63A2F"
              style={{ alignSelf: "flex-start", marginTop: 6 }}
            />
          )}
        </Animated.View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              fontSize: 28,
              color: "#1F1B1A",
            }}
          >
            Members ({members.length})
          </Text>
          <Users color="#3F6F8A" size={22} />
        </View>

        {members.map((m, i) => (
          <MemberRow
            key={m.id}
            member={m}
            isOwnerRow={m.id === circle.ownerId}
            viewerIsAdmin={isAdmin}
            delay={140 + i * 70}
            onAction={(target) => setActionMember(target)}
          />
        ))}

        {isAdmin ? (
          <Animated.View
            entering={FadeInDown.delay(200 + members.length * 70)
              .springify().damping(14).stiffness(320).mass(0.5)

}
          >
            <AnimatedPressable
              onPress={() => setShowInvite(true)}
              pressScale={0.97}
              style={{
                backgroundColor: "#A63A2F",
                marginTop: 28,
                paddingVertical: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                shadowColor: "#A63A2F",
                shadowOpacity: 0.3,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 5,
              }}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#FFF8F5",
                  fontSize: 18,
                  marginRight: 10,
                }}
              >
                Invite Friends
              </Text>
              <UserPlus color="#FFF8F5" size={20} />
            </AnimatedPressable>

            <View style={{ alignItems: "center", marginTop: 32 }}>
              <View
                style={{
                  height: 1,
                  backgroundColor: "#EADBCF",
                  alignSelf: "stretch",
                  marginBottom: 18,
                }}
              />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  color: "rgba(31,27,26,0.45)",
                  fontSize: 12,
                  letterSpacing: 1.2,
                  marginBottom: 10,
                }}
              >
                DANGER ZONE
              </Text>
              <AnimatedPressable
                pressScale={0.95}
                onPress={onDeleteCircle}
                disabled={deleting}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? (
                  <ActivityIndicator color="#A63A2F" />
                ) : (
                  <>
                    <Trash2 color="#A63A2F" size={20} />
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_800ExtraBold",
                        color: "#A63A2F",
                        fontSize: 17,
                        marginLeft: 8,
                      }}
                    >
                      Delete Circle
                    </Text>
                  </>
                )}
              </AnimatedPressable>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.5)",
                  fontSize: 13,
                  marginTop: 6,
                  textAlign: "center",
                  paddingHorizontal: 24,
                }}
              >
                Permanently removes this circle and all its pins for{"\n"}
                every member. This cannot be undone.
              </Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(200 + members.length * 70)
              .springify().damping(14).stiffness(320).mass(0.5)

}
            style={{ alignItems: "center", marginTop: 36 }}
          >
            <AnimatedPressable
              pressScale={0.95}
              onPress={onLeave}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
              }}
            >
              <LogOut color="#A63A2F" size={20} />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#A63A2F",
                  fontSize: 18,
                  marginLeft: 8,
                }}
              >
                Leave Circle
              </Text>
            </AnimatedPressable>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                color: "rgba(31,27,26,0.4)",
                fontSize: 15,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              You'll need a new invite to join{"\n"}back later.
            </Text>
          </Animated.View>
        )}

        {isAdmin && (
          <Animated.View
            entering={FadeIn.delay(260 + members.length * 70).springify().damping(14).stiffness(320).mass(0.5)}
            style={{
              backgroundColor: "rgba(249,220,196,0.85)",
              marginTop: 32,
              paddingHorizontal: 20,
              paddingVertical: 22,
              borderRadius: 18,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                fontStyle: "italic",
                fontSize: 16,
                color: "rgba(31,27,26,0.8)",
                textAlign: "center",
                lineHeight: 24,
              }}
            >
              "The best memories are the ones we{"\n"}make together."
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <Modal
        visible={showInvite}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInvite(false)}
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
                  Invite a friend
                </Text>
                <AnimatedPressable
                  pressScale={0.92}
                  onPress={() => setShowInvite(false)}
                >
                  <X color="#1F1B1A" size={24} />
                </AnimatedPressable>
              </View>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.7)",
                  fontSize: 15,
                  marginBottom: 14,
                }}
              >
                Enter their email — they'll see the invite next time they open
                BullePin.
              </Text>
              <TextInput
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="friend@example.com"
                placeholderTextColor="#9C8A80"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 16,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  color: "#1F1B1A",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#F1E2D8",
                }}
              />
              <AnimatedPressable
                onPress={onInvite}
                disabled={inviting}
                pressScale={0.97}
                style={{
                  backgroundColor: "#A63A2F",
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRadius: 999,
                  opacity: inviting ? 0.6 : 1,
                }}
              >
                {inviting ? (
                  <ActivityIndicator color="#FFF8F5" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: "#FFF8F5",
                      fontSize: 18,
                    }}
                  >
                    Send invite
                  </Text>
                )}
              </AnimatedPressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={!!actionMember}
        transparent
        animationType="fade"
        onRequestClose={() => setActionMember(null)}
      >
        <AnimatedPressable
          onPress={() => setActionMember(null)}
          pressScale={1}
          style={{
            flex: 1,
            backgroundColor: "rgba(31,27,26,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFF8F5",
              width: 280,
              padding: 12,
              borderRadius: 24,
            }}
          >
            {actionMember && (
              <>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#1F1B1A",
                    fontSize: 18,
                    textAlign: "center",
                    marginVertical: 12,
                  }}
                >
                  {actionMember.name}
                </Text>
                {actionMember.role === "Member" ? (
                  <AnimatedPressable
                    onPress={() => onMemberAction(actionMember, "promote")}
                    pressScale={0.97}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <ShieldCheck color="#3F6F8A" size={20} />
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_600SemiBold",
                        color: "#1F1B1A",
                        fontSize: 16,
                        marginLeft: 12,
                      }}
                    >
                      Promote to Admin
                    </Text>
                  </AnimatedPressable>
                ) : (
                  <AnimatedPressable
                    onPress={() => onMemberAction(actionMember, "demote")}
                    pressScale={0.97}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  >
                    <ShieldCheck color="#7A6E68" size={20} />
                    <Text
                      style={{
                        fontFamily: "PlusJakartaSans_600SemiBold",
                        color: "#1F1B1A",
                        fontSize: 16,
                        marginLeft: 12,
                      }}
                    >
                      Demote to Member
                    </Text>
                  </AnimatedPressable>
                )}
                <AnimatedPressable
                  onPress={() => onMemberAction(actionMember, "remove")}
                  pressScale={0.97}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <UserMinus color="#A63A2F" size={20} />
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: "#A63A2F",
                      fontSize: 16,
                      marginLeft: 12,
                    }}
                  >
                    Remove from Circle
                  </Text>
                </AnimatedPressable>
              </>
            )}
          </View>
        </AnimatedPressable>
      </Modal>
    </SafeAreaView>
  );
}
