import React, { useRef, useState } from "react";
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "./components/Icons";
import { ONBOARDING_KEY } from "./index";

const { width } = Dimensions.get("window");
const slides = [
  {
    key: "welcome",
    title: "Welcome to SafeTap",
    description: "Your trusted connection to Zimbabwe Republic Police information and essential public-safety services.",
    logo: true,
    label: "Official ZRP digital service",
  },
  {
    key: "stations",
    title: "Find help nearby",
    description: "Search police stations, explore the map, and call the right station directly when you need assistance.",
    icon: "location",
    label: "Stations, directions and contacts",
  },
  {
    key: "services",
    title: "Services that keep you informed",
    description: "Use guided reporting and follow verified ZRP news. Optional permissions are requested only when needed.",
    icon: "shield-checkmark",
    label: "Reports and trusted updates",
  },
];

function Slide({ item, index, scrollX }) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const opacity = scrollX.interpolate({ inputRange: range, outputRange: [0.2, 1, 0.2], extrapolate: "clamp" });
  const translateY = scrollX.interpolate({ inputRange: range, outputRange: [22, 0, 22], extrapolate: "clamp" });
  const scale = scrollX.interpolate({ inputRange: range, outputRange: [0.88, 1, 0.88], extrapolate: "clamp" });

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.visual, { opacity, transform: [{ translateY }, { scale }] }]}>
        <View style={styles.visualRing}>
          {item.logo ? (
            <Image source={require("../assets/images/logo-alternate.png")} style={styles.mainLogo} resizeMode="contain" />
          ) : (
            <View style={styles.iconCircle}>
              <Ionicons name={item.icon} size={58} color="#FFFFFF" />
            </View>
          )}
        </View>
        <View style={styles.officialPill}>
          <Ionicons name="checkmark-circle" size={17} color="#059669" />
          <Text style={styles.officialText}>{item.label}</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.copy, { opacity, transform: [{ translateY }] }]}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </Animated.View>
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "complete");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn("Could not save onboarding state", error);
    } finally {
      router.replace("/(tabs)");
    }
  };

  const goTo = (index) => {
    Haptics.selectionAsync().catch(() => {});
    listRef.current?.scrollToIndex({ index, animated: true });
  };

  const next = () => page === slides.length - 1 ? finish() : goTo(page + 1);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" backgroundColor="#1E3A8A" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <View style={styles.brandMark}>
            <Image source={require("../assets/images/logo-alternate.png")} style={styles.headerLogo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>SafeTap</Text>
              <Text style={styles.brandSubtitle}>Zimbabwe Republic Police</Text>
            </View>
          </View>
          <Pressable onPress={finish} disabled={finishing} hitSlop={12}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { width: scrollX.interpolate({ inputRange: [0, width * (slides.length - 1)], outputRange: ["33.33%", "100%"], extrapolate: "clamp" }) },
            ]}
          />
        </View>
      </View>

      <Animated.FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => <Slide item={item} index={index} scrollX={scrollX} />}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(event) => setPage(Math.round(event.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerTop}>
          <Pressable onPress={() => goTo(page - 1)} disabled={page === 0} style={[styles.backButton, page === 0 && styles.backButtonHidden]}>
            <Ionicons name="arrow-back" size={21} color="#1E3A8A" />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={styles.dots}>
            {slides.map((slide, index) => <View key={slide.key} style={[styles.dot, index === page && styles.dotActive]} />)}
          </View>
        </View>
        <Pressable onPress={next} disabled={finishing} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}>
          <Text style={styles.primaryText}>{page === slides.length - 1 ? "Get started" : "Continue"}</Text>
          <Ionicons name="arrow-forward" size={21} color="#172554" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { backgroundColor: "#1E3A8A", paddingHorizontal: 20, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerRow: { minHeight: 66, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brandMark: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 40, height: 40 },
  brandName: { color: "#FFFFFF", fontFamily: "GoogleSans_700Bold", fontSize: 17 },
  brandSubtitle: { color: "#BFDBFE", fontFamily: "GoogleSans_400Regular", fontSize: 11, marginTop: 1 },
  skip: { color: "#FFFFFF", fontFamily: "GoogleSans_600SemiBold", fontSize: 14, padding: 8 },
  progressTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: "#FBBF24", borderRadius: 2 },
  slide: { width, flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  visual: { height: 310, backgroundColor: "#EFF6FF", borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#DBEAFE" },
  visualRing: { width: 190, height: 190, borderRadius: 95, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#BFDBFE" },
  mainLogo: { width: 145, height: 145 },
  iconCircle: { width: 116, height: 116, borderRadius: 58, backgroundColor: "#1E3A8A", alignItems: "center", justifyContent: "center", shadowColor: "#1E3A8A", shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  officialPill: { position: "absolute", bottom: 20, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 12, height: 36, borderWidth: 1, borderColor: "#E2E8F0" },
  officialText: { color: "#334155", fontFamily: "GoogleSans_500Medium", fontSize: 11 },
  copy: { alignItems: "center", marginTop: 26, paddingHorizontal: 4 },
  title: { color: "#0F172A", fontFamily: "GoogleSans_700Bold", fontSize: 29, lineHeight: 35, textAlign: "center", letterSpacing: -0.5 },
  description: { color: "#64748B", fontFamily: "GoogleSans_400Regular", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 12, maxWidth: 355 },
  footer: { paddingHorizontal: 20, paddingTop: 10 },
  footerTop: { height: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  backButton: { flexDirection: "row", alignItems: "center", gap: 5, minWidth: 70 },
  backButtonHidden: { opacity: 0 },
  backText: { color: "#1E3A8A", fontFamily: "GoogleSans_600SemiBold", fontSize: 14 },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#CBD5E1" },
  dotActive: { width: 22, backgroundColor: "#1E3A8A" },
  primaryButton: { height: 56, borderRadius: 16, backgroundColor: "#FBBF24", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryButtonPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  primaryText: { color: "#172554", fontFamily: "GoogleSans_700Bold", fontSize: 16 },
});
