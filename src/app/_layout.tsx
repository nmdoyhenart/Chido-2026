import { Stack } from "expo-router";
import "../../global.css";
import { AppSessionProvider } from "../contexts/AppSessionContext";
import PushNotificationsBootstrap from '../components/notificaciones/PushNotificationsBootstrap';

export default function RootLayout() {
  return (
    <AppSessionProvider>
      <PushNotificationsBootstrap />
      <Stack screenOptions={{ headerShown: false }} />
    </AppSessionProvider>
  );
}
