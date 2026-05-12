/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: "#A63A2F", // Deep red — buttons, headers, accents
          dark: "#8B2E25",
          light: "#C45447",
        },
        // Surfaces
        cream: "#FFF8F5",        // App background
        surface: "#F7E8DF",      // Member rows / muted card surface
        peach: "#F9DCC4",        // Tags, "What" highlight
        // Accents
        sky: "#BFD9E8",          // Maybe button
        ash: "#E5DDD7",          // No button / neutral
        ink: "#1F1B1A",          // Primary text
        muted: "#7A6E68",        // Secondary text
        teal: "#3F6F8A",         // Member icon, "Sam admin" label
      },
      fontFamily: {
        display: ["PlusJakartaSans_800ExtraBold"],
        displayHeavy: ["PlusJakartaSans_700Bold"],
        body: ["PlusJakartaSans_500Medium"],
        bodyBold: ["PlusJakartaSans_600SemiBold"],
        regular: ["PlusJakartaSans_400Regular"],
      },
      borderRadius: {
        "3xl": "32px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(166, 58, 47, 0.08)",
      },
    },
  },
  plugins: [],
};
