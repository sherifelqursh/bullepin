import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Calendar,
  MapPin,
  Pin as PinIcon,
  Camera,
  X,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { api } from "../../../../lib/api";
import { useToast } from "../../../../lib/toast";
import { AnimatedPressable } from "../../../../components/AnimatedPressable";
import { AppHeader } from "../../../../components/AppHeader";

export default function NewPin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [whenText, setWhenText] = useState("");
  const [whereText, setWhereText] = useState("");
  const [notes, setNotes] = useState("");
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pickCover = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show("Photo permission needed", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.4,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      toast.show("Image was empty", "error");
      return;
    }
    const dataUrl = `data:image/jpeg;base64,${asset.base64}`;
    setCoverDataUrl(dataUrl);
    setCoverPreview(asset.uri);
  };

  const onPin = async () => {
    if (!id) return;
    if (!title.trim()) {
      toast.show("Give your pin a title", "error");
      return;
    }
    setBusy(true);
    try {
      const { pin } = await api.createPin(id, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        when: whenText.trim() || undefined,
        where: whereText.trim() || undefined,
        coverDataUrl: coverDataUrl ?? undefined,
      });
      toast.show("Pinned!", "success");
      router.replace(`/event/${pin.id}?cid=${pin.circleId}`);
    } catch (err: any) {
      toast.show(err?.message ?? "Could not pin", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title="Pin to Circle"
        titleSize={28}
        topPadding={28}
        showBack
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 160 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.springify().damping(14).stiffness(320).mass(0.5)}
            style={{ alignItems: "center", marginTop: 8, marginBottom: 24 }}
          >
            <View
              style={{
                backgroundColor: "#F9DCC4",
                paddingHorizontal: 14,
                paddingVertical: 6,
                marginBottom: 14,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_700Bold",
                  fontSize: 13,
                  color: "#1F1B1A",
                }}
              >
                New Pin
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color: "#A63A2F",
                fontSize: 38,
                lineHeight: 44,
                textAlign: "center",
                letterSpacing: -1,
              }}
            >
              What's happening?
            </Text>
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                color: "rgba(31,27,26,0.7)",
                fontSize: 16,
                textAlign: "center",
                marginTop: 8,
                paddingHorizontal: 12,
                lineHeight: 22,
              }}
            >
              Jot down the details of your upcoming event. Keep it simple and
              friendly!
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(80).springify().damping(14).stiffness(320).mass(0.5)}
            style={{
              backgroundColor: "rgba(249,220,196,0.85)",
              padding: 18,
              marginBottom: 14,
              borderRadius: 26,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "rgba(31,27,26,0.85)",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              What
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Birthday Hangout, Study Session..."
              placeholderTextColor="#A8917F"
              multiline
              style={{
                fontFamily: "PlusJakartaSans_800ExtraBold",
                color: "rgba(31,27,26,0.85)",
                fontSize: 24,
                lineHeight: 32,
              }}
            />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(140).springify().damping(14).stiffness(320).mass(0.5)}
            style={{
              backgroundColor: "#EFE3DA",
              padding: 16,
              marginBottom: 14,
              borderRadius: 24,
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "rgba(31,27,26,0.85)",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              When
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Calendar color="#3F6F8A" size={18} />
              <TextInput
                value={whenText}
                onChangeText={setWhenText}
                placeholder="Sat, Aug 12 · 4:00 PM"
                placeholderTextColor="#9C8A80"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  color: "#1F1B1A",
                }}
              />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(200).springify().damping(14).stiffness(320).mass(0.5)}
            style={{
              backgroundColor: "#F4E5DC",
              padding: 16,
              marginBottom: 14,
              borderRadius: 24,
              borderBottomWidth: 1.5,
              borderBottomColor: "#E9C9AE",
            }}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "rgba(31,27,26,0.85)",
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Where
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MapPin color="#A63A2F" size={18} />
              <TextInput
                value={whereText}
                onChangeText={setWhereText}
                placeholder="Oak Park or Zoom"
                placeholderTextColor="#9C8A80"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  fontFamily: "PlusJakartaSans_500Medium",
                  fontSize: 16,
                  color: "#1F1B1A",
                }}
              />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(260).springify().damping(14).stiffness(320).mass(0.5)}
            style={{
              backgroundColor: "#F4E5DC",
              padding: 16,
              marginBottom: 18,
              borderRadius: 24,
              borderLeftWidth: 5,
              borderLeftColor: "#3F6F8A",
              flexDirection: "row",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: "PlusJakartaSans_800ExtraBold",
                  color: "#1F1B1A",
                  fontSize: 16,
                  marginBottom: 4,
                }}
              >
                Extra Notes
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Bring some snacks and your favorite board game!"
                placeholderTextColor="#9C8A80"
                multiline
                numberOfLines={3}
                style={{
                  fontFamily: "PlusJakartaSans_500Medium",
                  color: "rgba(31,27,26,0.8)",
                  fontSize: 15,
                  lineHeight: 22,
                  textAlignVertical: "top",
                }}
              />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(320).springify().damping(14).stiffness(320).mass(0.5)}
          >
            <AnimatedPressable
              onPress={pickCover}
              pressScale={0.985}
              style={{
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: "#E5C9B9",
                borderStyle: "dashed",
                minHeight: 200,
                overflow: "hidden",
                backgroundColor: "#F9DCC4",
              }}
            >
              {coverPreview ? (
                <Image
                  source={{ uri: coverPreview }}
                  style={{ width: "100%", height: 220 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 36 }}>
                  <Camera color="#7A6E68" size={32} />
                  <Text
                    style={{
                      fontFamily: "PlusJakartaSans_700Bold",
                      color: "rgba(31,27,26,0.7)",
                      fontSize: 16,
                      marginTop: 8,
                    }}
                  >
                    Add a cover photo
                  </Text>
                </View>
              )}
              {coverPreview && (
                <AnimatedPressable
                  pressScale={0.85}
                  onPress={() => {
                    setCoverPreview(null);
                    setCoverDataUrl(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "rgba(31,27,26,0.7)",
                    borderRadius: 999,
                    padding: 7,
                  }}
                >
                  <X color="#FFF8F5" size={16} />
                </AnimatedPressable>
              )}
            </AnimatedPressable>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(380).springify().damping(14).stiffness(320).mass(0.5)}
          >
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                color: "#1F1B1A",
                fontSize: 15,
                textAlign: "center",
                marginBottom: 18,
              }}
            >
              Pinning this will notify all members of this Circle.
            </Text>
            <AnimatedPressable
              onPress={onPin}
              disabled={busy}
              pressScale={0.97}
              style={{
                backgroundColor: "#A63A2F",
                paddingVertical: 18,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                opacity: busy ? 0.6 : 1,
                shadowColor: "#A63A2F",
                shadowOpacity: 0.3,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
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
                      color: "#FFF8F5",
                      fontSize: 22,
                      marginRight: 10,
                    }}
                  >
                    Pin It
                  </Text>
                  <PinIcon color="#FFF8F5" size={22} fill="#FFF8F5" />
                </>
              )}
            </AnimatedPressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
