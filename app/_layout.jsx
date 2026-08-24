import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { Text, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GoogleSans_400Regular } from '@expo-google-fonts/google-sans/400Regular';
import { GoogleSans_500Medium } from '@expo-google-fonts/google-sans/500Medium';
import { GoogleSans_600SemiBold } from '@expo-google-fonts/google-sans/600SemiBold';
import { GoogleSans_700Bold } from '@expo-google-fonts/google-sans/700Bold';
import 'react-native-reanimated';
import './global.css';
import api from '../lib/connection';


// // Prevent the splash screen from auto-hiding before asset loading is complete.
// SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const pathname = usePathname();
  // const [loaded] = useFonts({
  //   SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  // });
  const [loaded] = useFonts({
    GoogleSans_400Regular,
    GoogleSans_500Medium,
    GoogleSans_600SemiBold,
    GoogleSans_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    const syncWhenOnline = (state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        api.resetNetworkCircuit();
        api.syncStationsForOffline().catch((error) => console.error('Station background sync failed', error));
      }
    };
    NetInfo.fetch().then(syncWhenOnline);
    return NetInfo.addEventListener(syncWhenOnline);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    api.trackEvent({ event_type: 'SCREEN_VIEW', feature_name: pathname });
  }, [pathname]);

  useEffect(() => {
    const trackAppOpen = async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      const lastLocation = permission.granted ? await Location.getLastKnownPositionAsync() : null;
      api.trackEvent({
        event_type: 'APP_OPEN',
        feature_name: 'mobile_app',
        latitude: lastLocation?.coords?.latitude,
        longitude: lastLocation?.coords?.longitude,
      });
    };
    trackAppOpen().catch(() => null);
  }, []);

  if (!loaded) {
    return null;
  }

  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = [{ fontFamily: 'GoogleSans_400Regular' }, Text.defaultProps.style];
  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.style = [{ fontFamily: 'GoogleSans_400Regular' }, TextInput.defaultProps.style];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />



        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaProvider></GestureHandlerRootView>
  );
}
