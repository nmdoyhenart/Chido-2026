import { Stack } from "expo-router";
import "../../global.css";
import { AppSessionProvider } from "../contexts/AppSessionContext";

export default function RootLayout() {
  return (
    <AppSessionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppSessionProvider>
  );
}
