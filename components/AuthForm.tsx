import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Pin, AtSign, Lock, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { AnimatedPressable } from "./AnimatedPressable";

type Props = { mode: "login" | "signup" };

const FIELD_BORDER = "#F1E2D8";

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        fontFamily: "PlusJakartaSans_600SemiBold",
        color: "#1F1B1A",
        fontSize: 15,
        marginBottom: 6,
        marginLeft: 2,
      }}
    >
      {children}
    </Text>
  );
}

function Field({
  value,
  onChangeText,
  placeholder,
  icon,
  secure,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  icon: React.ReactNode;
  secure?: boolean;
  keyboardType?: "default" | "email-address";
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFF8F5",
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: FIELD_BORDER,
        paddingHorizontal: 18,
        paddingVertical: Platform.OS === "ios" ? 14 : 10,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#8E7E76"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize="none"
        keyboardType={keyboardType ?? "default"}
        style={{
          flex: 1,
          fontFamily: "PlusJakartaSans_500Medium",
          fontSize: 16,
          color: "#1F1B1A",
          padding: 0,
        }}
      />
      {icon}
    </View>
  );
}

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const { signIn, signUp, resetPassword } = useAuth();
  const toast = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const submit = async () => {
    if (!identifier.trim() || !password) {
      toast.show("Enter your phone/email and password", "error");
      return;
    }
    if (isSignup && !name.trim()) {
      toast.show("Pick a display name so your circles can recognize you", "error");
      return;
    }
    setBusy(true);
    try {
      if (isSignup) {
        await signUp(identifier.trim(), password, name.trim() || undefined);
        toast.show("Welcome to BullePin!", "success");
      } else {
        await signIn(identifier.trim(), password);
      }
    } catch (err: any) {
      toast.show(err?.message ?? "Something went wrong", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
            paddingVertical: 36,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.springify().damping(14).stiffness(320).mass(0.5)}
            style={{ alignItems: "center", marginBottom: 28 }}
          >
            <View
              style={{
                height: 84,
                width: 84,
                borderRadius: 999,
                backgroundColor: "#A63A2F",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
                shadowColor: "#A63A2F",
                shadowOpacity: 0.32,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 6,
              }}
            >
              <Pin color="#FFF8F5" size={36} fill="#FFF8F5" />
            </View>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_800ExtraBold",
                fontSize: 56,
                color: "#A63A2F",
                lineHeight: 60,
                letterSpacing: -1.5,
              }}
            >
              BullePin
            </Text>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                fontSize: 16,
                color: "#1F1B1A",
                marginTop: 6,
              }}
            >
              where your circle stays connected.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(140).springify().damping(14).stiffness(320).mass(0.5)}
            style={{
              paddingHorizontal: 4,
              paddingTop: 4,
            }}
          >
            {isSignup && (
              <>
                <FieldLabel>Display Name</FieldLabel>
                <View style={{ marginBottom: 16 }}>
                  <Field
                    value={name}
                    onChangeText={setName}
                    placeholder="What should we call you?"
                    icon={<AtSign color="#8E7E76" size={18} />}
                  />
                </View>
              </>
            )}

            <FieldLabel>Phone or Email</FieldLabel>
            <View style={{ marginBottom: 18 }}>
              <Field
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="Say hello..."
                icon={<AtSign color="#8E7E76" size={18} />}
                keyboardType="email-address"
              />
            </View>

            <FieldLabel>Password</FieldLabel>
            <View style={{ marginBottom: 18 }}>
              <Field
                value={password}
                onChangeText={setPassword}
                placeholder="Your secret code"
                icon={<Lock color="#8E7E76" size={18} />}
                secure
              />
            </View>

            {!isSignup && (
              <View
                style={{
                  alignItems: "flex-end",
                  marginBottom: 22,
                }}
              >
                <AnimatedPressable
                  onPress={async () => {
                    try {
                      await resetPassword(identifier);
                      toast.show(
                        "Reset email sent — check your inbox.",
                        "success"
                      );
                    } catch (err: any) {
                      toast.show(
                        err?.message ?? "Could not send reset email",
                        "error"
                      );
                    }
                  }}
                  pressScale={0.95}
                  style={{ paddingVertical: 4, paddingHorizontal: 6 }}
                >
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_700Bold",
                      color: "#3F6F8A",
                      fontSize: 15,
                    }}
                  >
                    Forgot password?
                  </Text>
                </AnimatedPressable>
              </View>
            )}
            {isSignup && <View style={{ marginBottom: 22 }} />}

            <AnimatedPressable
              onPress={submit}
              disabled={busy}
              pressScale={0.97}
              style={{
                backgroundColor: "#A63A2F",
                borderRadius: 999,
                paddingVertical: 18,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity: busy ? 0.7 : 1,
                shadowColor: "#A63A2F",
                shadowOpacity: 0.3,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 10 },
                elevation: 5,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#FFF8F5" />
              ) : (
                <>
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_800ExtraBold",
                      fontSize: 22,
                      color: "#FFF8F5",
                      letterSpacing: 0.2,
                    }}
                  >
                    {isSignup ? "Join" : "Login"}
                  </Text>
                  <Animated.View
                    entering={FadeIn.delay(280)}
                    style={{ marginLeft: 10 }}
                  >
                    <ArrowRight color="#FFF8F5" size={22} />
                  </Animated.View>
                </>
              )}
            </AnimatedPressable>

          </Animated.View>

          <Animated.View
            entering={FadeIn.delay(280).springify().damping(14).stiffness(320).mass(0.5)}
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                color: "#1F1B1A",
                fontSize: 15,
              }}
            >
              {isSignup ? "Already have an account? " : "Don't have an account? "}
            </Text>
            <AnimatedPressable
              pressScale={0.95}
              onPress={() =>
                router.replace(isSignup ? "/(auth)/login" : "/(auth)/signup")
              }
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#A63A2F",
                  fontSize: 15,
                }}
              >
                {isSignup ? "Login" : "Join BullePin"}
              </Text>
            </AnimatedPressable>
          </Animated.View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 36,
              gap: 28,
            }}
          >
            {["Privacy", "Terms", "Help"].map((l) => (
              <Text
                key={l}
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.4)",
                  fontSize: 14,
                }}
              >
                {l}
              </Text>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
