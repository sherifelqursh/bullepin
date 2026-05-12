import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Mail,
  Phone,
  Lock,
  HelpCircle,
  Edit3,
  Trash2,
  X,
} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { resolveImageUrl, colorFor, initialsOf } from "../../lib/avatar";
import { AnimatedPressable } from "../../components/AnimatedPressable";
import { Polaroid } from "../../components/Polaroid";
import { AppHeader } from "../../components/AppHeader";

// Public legal pages. Update LEGAL_BASE_URL once your GitHub Pages
// site (or whatever host you use) is live — see docs/PRIVACY.md /
// docs/TERMS.md.
const LEGAL_BASE_URL = "https://elqurshdev.github.io/bullepin";
const URLS = {
  privacy: `${LEGAL_BASE_URL}/privacy`,
  terms: `${LEGAL_BASE_URL}/terms`,
  help: `${LEGAL_BASE_URL}/help`,
};

function diceBearUrl(seed: string, size: number) {
  const safe = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/lorelei/png?seed=${safe}&size=${Math.round(
    size * 2
  )}&backgroundType=solid&backgroundColor=f9dcc4,bfd9e8,f1c7b6,c9b6e4,a8c4a2,f2c77e`;
}

export default function Profile() {
  const router = useRouter();
  const { user, signOut, setUser, changePassword, updateProfile, deleteAccount } = useAuth();
  const toast = useToast();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const avatarUrl = resolveImageUrl(user.avatarUrl) ?? diceBearUrl(user.name, 240);
  const bg = colorFor(user.name);

  const onPickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show("Photo permission needed", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    try {
      const { avatarUrl } = await api.uploadAvatar(
        `data:image/jpeg;base64,${asset.base64}`
      );
      setUser({ ...user, avatarUrl });
      toast.show("Profile photo updated", "success");
    } catch (err: any) {
      toast.show(err?.message ?? "Upload failed", "error");
    }
  };

  const onSaveName = async () => {
    if (!name.trim() || name === user.name) {
      setEditingName(false);
      setName(user.name);
      return;
    }
    setSavingName(true);
    try {
      await updateProfile({ name: name.trim() });
      setEditingName(false);
      toast.show("Name updated", "success");
    } catch (err: any) {
      toast.show(err?.message ?? "Save failed", "error");
    } finally {
      setSavingName(false);
    }
  };

  const onChangePassword = async () => {
    if (!currentPw || !newPw) {
      toast.show("Fill in both fields", "error");
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(currentPw, newPw);
      setShowPassword(false);
      setCurrentPw("");
      setNewPw("");
      toast.show("Password changed", "success");
    } catch (err: any) {
      toast.show(err?.message ?? "Change failed", "error");
    } finally {
      setSavingPw(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deletePw) {
      toast.show("Enter your password to confirm", "error");
      return;
    }
    setDeleting(true);
    try {
      await deleteAccount(deletePw);
      // Account is gone — RouteGuard kicks us to /(auth)/login on next render.
      router.replace("/(auth)/login");
    } catch (err: any) {
      toast.show(err?.message ?? "Couldn't delete account", "error");
      setDeleting(false);
    }
  };

  const confirmLogout = () => {
    const proceed = async () => {
      await signOut();
      router.replace("/(auth)/login");
    };
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined"
          ? window.confirm("Log out of BullePin?")
          : true;
      if (ok) proceed();
    } else {
      Alert.alert("Log out?", "You'll need to sign in again next time.", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: proceed },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title="Settings"
        titleSize={32}
        topPadding={32}
        showBack
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      >
        <View style={{ alignItems: "center", marginBottom: 32, marginTop: 12 }}>
          <Polaroid rotate={-3} delay={80}>
            <AnimatedPressable pressScale={0.96} onPress={onPickAvatar}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 8,
                    backgroundColor: bg,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 140,
                    height: 140,
                    backgroundColor: bg,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: "#1F1B1A",
                      fontSize: 36,
                    }}
                  >
                    {initialsOf(user.name) || "?"}
                  </Text>
                </View>
              )}
            </AnimatedPressable>
            <AnimatedPressable
              pressScale={0.96}
              onPress={() => setEditingName(true)}
              style={{ alignItems: "center", paddingTop: 10 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#A63A2F",
                    fontSize: 22,
                  }}
                >
                  {user.name.split(" ")[0]}
                </Text>
                <Edit3
                  color="#A63A2F"
                  size={16}
                  style={{ marginLeft: 8 }}
                />
              </View>
            </AnimatedPressable>
          </Polaroid>
          <AnimatedPressable
            pressScale={0.96}
            onPress={() => setEditingName(true)}
            style={{
              marginTop: 18,
              paddingHorizontal: 16,
              paddingVertical: 6,
              borderRadius: 999,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                color: "rgba(31,27,26,0.5)",
                fontSize: 13,
              }}
            >
              Tap photo to change · tap name to edit
            </Text>
          </AnimatedPressable>
        </View>

        <Animated.View entering={FadeInDown.delay(120).springify().damping(14).stiffness(320).mass(0.5)}>
          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              color: "#1F1B1A",
              fontSize: 28,
              marginBottom: 12,
            }}
          >
            Account Info
          </Text>

          <View
            style={{
              backgroundColor: "#F4E5DC",
              paddingHorizontal: 16,
              paddingVertical: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 22,
            }}
          >
            <View
              style={{
                height: 44,
                width: 44,
                backgroundColor: "#E2EEF4",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                borderRadius: 999,
              }}
            >
              <Mail color="#3F6F8A" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#1F1B1A",
                  fontSize: 16,
                }}
              >
                Email
              </Text>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.65)",
                  fontSize: 15,
                }}
              >
                {user.email ?? "Not set"}
              </Text>
            </View>
          </View>

          <View
            style={{
              backgroundColor: "#F4E5DC",
              paddingHorizontal: 16,
              paddingVertical: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 22,
            }}
          >
            <View
              style={{
                height: 44,
                width: 44,
                backgroundColor: "#F9DCC4",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                borderRadius: 999,
              }}
            >
              <Phone color="#A63A2F" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#1F1B1A",
                  fontSize: 16,
                }}
              >
                Phone
              </Text>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.65)",
                  fontSize: 15,
                }}
              >
                {user.phone ?? "Not set"}
              </Text>
            </View>
          </View>

          <AnimatedPressable
            pressScale={0.985}
            onPress={() => setShowPassword(true)}
            style={{
              backgroundColor: "#F4D6BC",
              paddingHorizontal: 16,
              paddingVertical: 16,
              marginBottom: 28,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 22,
            }}
          >
            <View
              style={{
                height: 44,
                width: 44,
                backgroundColor: "#FBE4DD",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
                borderRadius: 999,
              }}
            >
              <Lock color="#A63A2F" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#1F1B1A",
                  fontSize: 16,
                }}
              >
                Reset Password
              </Text>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.65)",
                  fontSize: 15,
                }}
              >
                Change/Reset your password
              </Text>
            </View>
            <Text
              style={{
                fontSize: 26,
                color: "rgba(31,27,26,0.45)",
                marginRight: 4,
              }}
            >
              ›
            </Text>
          </AnimatedPressable>
        </Animated.View>


        <Animated.View entering={FadeInDown.delay(240).springify().damping(14).stiffness(320).mass(0.5)}>
          <Text
            style={{
              fontFamily: "PlusJakartaSans_800ExtraBold",
              color: "#1F1B1A",
              fontSize: 28,
              marginBottom: 12,
            }}
          >
            Support & Legal
          </Text>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 28 }}>
            <AnimatedPressable
              pressScale={0.97}
              onPress={() => Linking.openURL(URLS.help)}
              style={{
                flex: 1,
                backgroundColor: "#E2EEF4",
                paddingHorizontal: 16,
                paddingVertical: 22,
                alignItems: "flex-start",
                justifyContent: "space-between",
                borderRadius: 22,
                minHeight: 116,
              }}
            >
              <HelpCircle color="#A63A2F" size={26} />
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#1F1B1A",
                  fontSize: 17,
                  marginTop: 28,
                }}
              >
                Help Center
              </Text>
            </AnimatedPressable>
            <View style={{ flex: 1, gap: 12 }}>
              <AnimatedPressable
                pressScale={0.97}
                onPress={() => Linking.openURL(URLS.terms)}
                style={{
                  backgroundColor: "#F1E2D8",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: "#1F1B1A",
                    fontSize: 15,
                  }}
                >
                  Terms of{"\n"}Service
                </Text>
                <Text
                  style={{ fontSize: 22, color: "rgba(31,27,26,0.45)" }}
                >
                  ›
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                pressScale={0.97}
                onPress={() => Linking.openURL(URLS.privacy)}
                style={{
                  backgroundColor: "#F1E2D8",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_700Bold",
                    color: "#1F1B1A",
                    fontSize: 15,
                  }}
                >
                  Privacy Policy
                </Text>
                <Text
                  style={{ fontSize: 22, color: "rgba(31,27,26,0.45)" }}
                >
                  ›
                </Text>
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).springify().damping(14).stiffness(320).mass(0.5)}
          style={{ alignItems: "center" }}
        >
          <AnimatedPressable
            pressScale={0.96}
            onPress={confirmLogout}
            style={{
              backgroundColor: "#A63A2F",
              paddingVertical: 16,
              paddingHorizontal: 56,
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
                fontSize: 22,
              }}
            >
              Log Out
            </Text>
          </AnimatedPressable>

          {/* Account deletion — required by App Store policy. */}
          <AnimatedPressable
            pressScale={0.95}
            onPress={() => setShowDelete(true)}
            style={{
              marginTop: 18,
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 8,
              paddingHorizontal: 14,
            }}
          >
            <Trash2 color="#A63A2F" size={16} />
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "#A63A2F",
                fontSize: 14,
                marginLeft: 6,
              }}
            >
              Delete account
            </Text>
          </AnimatedPressable>
          <Text
            style={{
              fontFamily: "PlusJakartaSans_500Medium",
              color: "rgba(31,27,26,0.4)",
              fontSize: 14,
              marginTop: 14,
            }}
          >
            Version 0.1.0 (Pinpoint)
          </Text>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={editingName}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingName(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(31,27,26,0.5)",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Animated.View
              entering={FadeInDown.springify().damping(14).stiffness(320).mass(0.5)}
              style={{
                backgroundColor: "#FFF8F5",
                width: "100%",
                padding: 22,
                borderRadius: 26,
                maxWidth: 420,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#1F1B1A",
                    fontSize: 22,
                  }}
                >
                  Edit name
                </Text>
                <AnimatedPressable
                  pressScale={0.92}
                  onPress={() => setEditingName(false)}
                >
                  <X color="#1F1B1A" size={20} />
                </AnimatedPressable>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
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
                pressScale={0.97}
                onPress={onSaveName}
                disabled={savingName}
                style={{
                  backgroundColor: "#A63A2F",
                  paddingVertical: 14,
                  alignItems: "center",
                  borderRadius: 999,
                  opacity: savingName ? 0.6 : 1,
                }}
              >
                {savingName ? (
                  <ActivityIndicator color="#FFF8F5" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: "#FFF8F5",
                      fontSize: 16,
                    }}
                  >
                    Save
                  </Text>
                )}
              </AnimatedPressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showPassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPassword(false)}
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
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#1F1B1A",
                    fontSize: 28,
                  }}
                >
                  Change password
                </Text>
                <AnimatedPressable
                  pressScale={0.92}
                  onPress={() => setShowPassword(false)}
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
                Current password
              </Text>
              <TextInput
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 14,
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
                New password
              </Text>
              <TextInput
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 18,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  color: "#1F1B1A",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#F1E2D8",
                }}
              />
              <AnimatedPressable
                pressScale={0.97}
                onPress={onChangePassword}
                disabled={savingPw}
                style={{
                  backgroundColor: "#A63A2F",
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRadius: 999,
                  opacity: savingPw ? 0.6 : 1,
                }}
              >
                {savingPw ? (
                  <ActivityIndicator color="#FFF8F5" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: "#FFF8F5",
                      fontSize: 18,
                    }}
                  >
                    Change password
                  </Text>
                )}
              </AnimatedPressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete account modal */}
      <Modal
        visible={showDelete}
        transparent
        animationType="fade"
        onRequestClose={() => !deleting && setShowDelete(false)}
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
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontFamily: "PlusJakartaSans_800ExtraBold",
                    color: "#A63A2F",
                    fontSize: 26,
                  }}
                >
                  Delete account?
                </Text>
                <AnimatedPressable
                  pressScale={0.92}
                  onPress={() => !deleting && setShowDelete(false)}
                >
                  <X color="#1F1B1A" size={24} />
                </AnimatedPressable>
              </View>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.75)",
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 18,
                }}
              >
                This is permanent. We'll:
                {"\n"}• delete every Circle you own (members & pins included),
                {"\n"}• remove you from Circles you've joined,
                {"\n"}• erase your profile and sign-in.
                {"\n\n"}
                Enter your current password to confirm.
              </Text>
              <TextInput
                value={deletePw}
                onChangeText={setDeletePw}
                secureTextEntry
                placeholder="Current password"
                placeholderTextColor="#9C8A80"
                style={{
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 18,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  color: "#1F1B1A",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#F1E2D8",
                }}
              />
              <AnimatedPressable
                pressScale={0.97}
                onPress={onConfirmDelete}
                disabled={deleting}
                style={{
                  backgroundColor: "#A63A2F",
                  paddingVertical: 16,
                  alignItems: "center",
                  borderRadius: 999,
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF8F5" />
                ) : (
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      color: "#FFF8F5",
                      fontSize: 18,
                    }}
                  >
                    Permanently delete account
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
