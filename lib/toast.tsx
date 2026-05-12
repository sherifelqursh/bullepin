import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, Animated } from "react-native";

type Toast = { id: number; message: string; tone: "info" | "error" | "success" };

const Ctx = createContext<{ show: (msg: string, tone?: Toast["tone"]) => void } | null>(
  null
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback(
    (message: string, tone: Toast["tone"] = "info") => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, message, tone }]);
      // Errors stay longer so the user can read them; URLs and stack traces
      // benefit from the extra dwell time.
      const dwell = tone === "error" ? 6500 : 2800;
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, dwell);
    },
    []
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          alignItems: "center",
          gap: 8,
        }}
      >
        {toasts.map((t) => (
          <View
            key={t.id}
            style={{
              backgroundColor:
                t.tone === "error"
                  ? "#A63A2F"
                  : t.tone === "success"
                  ? "#3F6F8A"
                  : "#1F1B1A",
              paddingHorizontal: 18,
              paddingVertical: 12,
              // Pill for short messages, rounded card for long ones.
              borderRadius: t.message.length > 60 ? 20 : 999,
              maxWidth: "90%",
              shadowColor: "#000",
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Text
              style={{
                color: "#FFF8F5",
                fontWeight: "600",
                lineHeight: 18,
              }}
            >
              {t.message}
            </Text>
          </View>
        ))}
      </View>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
