import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
  StatusBar,
  Image,
  Share,
  Animated,
  PanResponder,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import api from "../../src/services/api";
import { triggerStationCall } from "../../lib/callTrigger";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineBanner from "../components/OfflineBanner";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../src/context/ThemeContext";

const { width, height } = Dimensions.get("window");
const ZRP_LOGO = require("../../assets/images/logo-alternate.png");

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isValidCoordinate = (lat, lng) =>
  lat !== null &&
  lat !== undefined &&
  lng !== null &&
  lng !== undefined &&
  !isNaN(parseFloat(lat)) &&
  !isNaN(parseFloat(lng)) &&
  parseFloat(lat) !== 0 &&
  parseFloat(lng) !== 0;

const PoliceMap = () => {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { colors, isDark } = useAppTheme();
  const mapRef = useRef(null);

  const PATTERN_BG = require("../../assets/images/fallback.png");

  const [userCoords, setUserCoords] = useState({ latitude: -17.8252, longitude: 31.0335 });
  const [mapRegion, setMapRegion] = useState({
    latitude: -17.8252,
    longitude: 31.0335,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [radiusFilter, setRadiusFilter] = useState(25);
  const [policeStations, setPoliceStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [drawerExpanded, setDrawerExpanded] = useState(false);

  const sheetAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -40 || g.vy < -0.3) {
          expandDrawer();
        } else if (g.dy > 40 || g.vy > 0.3) {
          collapseDrawer();
        }
      },
    })
  ).current;

  const expandDrawer = () => {
    setDrawerExpanded(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: false, tension: 70, friction: 12 }).start();
  };

  const collapseDrawer = () => {
    setDrawerExpanded(false);
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: false, tension: 70, friction: 12 }).start();
  };

  const toggleDrawer = () => {
    if (drawerExpanded) collapseDrawer();
    else expandDrawer();
  };

  const fetchPoliceStations = async (coords, radius = radiusFilter) => {
    try {
      setLoading(true);
      const targetCoords = coords || userCoords;
      const res = await api.policeStations.getNearMe(
        targetCoords.latitude,
        targetCoords.longitude,
        radius,
        1,
        50
      );

      const items = (res.items || []).map((s) => {
        const lat = parseFloat(s.latitude);
        const lng = parseFloat(s.longitude);
        return {
          id: s.id,
          station: s.name,
          name: s.name,
          latitude: lat,
          longitude: lng,
          station_number: s.station_number,
          phone: s.phone,
          whatsapp: s.whatsapp,
          district: s.district,
          province: s.province,
          officer_in_charge: s.officer_in_charge,
          address: `${s.district}, ${s.province}`,
          distance: s.distance_km || getDistanceFromLatLonInKm(targetCoords.latitude, targetCoords.longitude, lat, lng),
        };
      });

      setPoliceStations(items);
      setFilteredStations(items);
    } catch (err) {
      console.log("Failed to fetch stations:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (location && location.coords) {
          const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
          setUserCoords(coords);
          setMapRegion({
            ...coords,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
          fetchPoliceStations(coords, radiusFilter);
          return;
        }
      }
    } catch (err) {
      console.log("Location error:", err);
    }
    fetchPoliceStations(userCoords, radiusFilter);
  };

  const triggerHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const focusOnStation = (station) => {
    if (!isValidCoordinate(station.latitude, station.longitude)) return;
    triggerHaptic();
    setSelectedStation(station);
    setShowListDrawer(false);
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: station.latitude,
          longitude: station.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        500
      );
    }
  };

  const focusOnUser = () => {
    triggerHaptic();
    if (userCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userCoords, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
        500
      );
    }
  };

  const handleRadiusChange = (radius) => {
    triggerHaptic();
    setRadiusFilter(radius);
    fetchPoliceStations(userCoords, radius);
  };

  const handleShareStation = async (station) => {
    try {
      const message = `ZRP Police Station: ${station.name || station.station}\nProvince: ${station.province || 'Zimbabwe'}\nDistrict: ${station.district || ''}\nPhone: ${station.phone || station.station_number || 'Emergency 999'}\nLocation: https://maps.google.com/?q=${station.latitude},${station.longitude}`;
      await Share.share({ title: `ZRP ${station.name || station.station}`, message });
    } catch (err) {
      console.log("Share map error:", err);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStations(policeStations);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredStations(
        policeStations.filter(
          (s) =>
            s.station?.toLowerCase().includes(q) ||
            s.address?.toLowerCase().includes(q) ||
            s.station_number?.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, policeStations]);

  const stationsWithValidCoords = filteredStations.filter((s) =>
    isValidCoordinate(s.latitude, s.longitude)
  );

  const drawerHeight = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [180, height * 0.58],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Fullscreen Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {/* ZRP Logo Markers on Map */}
        {stationsWithValidCoords.map((station, index) => {
          const isSelected = selectedStation?.id === station.id;
          return (
            <Marker
              key={station.id || index}
              coordinate={{
                latitude: station.latitude,
                longitude: station.longitude,
              }}
              onPress={() => focusOnStation(station)}
            >
              <View style={[styles.zrpMarkerWrap, { backgroundColor: colors.surface, borderColor: isSelected ? colors.danger : colors.primary }, isSelected && styles.zrpMarkerWrapSelected]}>
                <Image source={ZRP_LOGO} style={styles.zrpMarkerImage} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Uber/inDrive Floating Search & Filter Bar Top */}
      <SafeAreaView style={styles.floatingHeaderContainer} pointerEvents="box-none">
        <View style={[styles.floatingSearchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: colors.sectionBg }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.inputInnerWrap}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.floatingInput, { color: colors.textPrimary }]}
              placeholder="Search police station or district..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={(t) => {
                setSearchQuery(t);
                if (t && !drawerExpanded) expandDrawer();
              }}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: colors.sectionBg }]} onPress={toggleDrawer}>
            <Ionicons name={drawerExpanded ? "chevron-down" : "list-outline"} size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Horizontal Distance Radius Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.radiusPillsScroll}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {[
            { label: "5 km", value: 5 },
            { label: "15 km", value: 15 },
            { label: "25 km", value: 25 },
            { label: "50 km", value: 50 },
            { label: "All Zimbabwe", value: 200 },
          ].map((pill) => (
            <TouchableOpacity
              key={pill.value}
              onPress={() => handleRadiusChange(pill.value)}
              style={[styles.floatingFilterPill, { backgroundColor: colors.surface, borderColor: colors.border }, radiusFilter === pill.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={[styles.floatingFilterPillText, { color: colors.textSecondary }, radiusFilter === pill.value && { color: "#FFFFFF" }]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>

      {!isOnline && <OfflineBanner />}

      {/* Floating GPS Re-Center Location Button */}
      <View style={styles.floatingFabContainer}>
        <TouchableOpacity style={[styles.floatingFabBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={focusOnUser}>
          <Ionicons name="navigate-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Floating Bottom Card: Selected Station (Uber/inDrive style) */}
      {selectedStation && !drawerExpanded ? (
        <View style={[styles.floatingStationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.closeCardBtn} onPress={() => setSelectedStation(null)}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.cardHeaderRow}>
            <Image source={ZRP_LOGO} style={styles.cardLogoImage} />
            <View style={styles.cardInfoCol}>
              <Text style={[styles.cardStationName, { color: colors.textPrimary }]} numberOfLines={1}>
                {selectedStation.name || selectedStation.station}
              </Text>
              <Text style={[styles.cardStationSub, { color: colors.textMuted }]} numberOfLines={1}>
                {selectedStation.district}, {selectedStation.province}
              </Text>
            </View>
            {selectedStation.distance !== undefined && (
              <View style={[styles.distBadge, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.distBadgeText, { color: colors.primary }]}>
                  {typeof selectedStation.distance === 'number' ? selectedStation.distance.toFixed(1) : selectedStation.distance} km
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardActionGrid}>
            <TouchableOpacity
              style={[styles.cardPrimaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => triggerStationCall(selectedStation.phone || selectedStation.station_number, selectedStation.name)}
            >
              <Ionicons name="call-outline" size={16} color="#FFFFFF" />
              <Text style={styles.cardPrimaryBtnText}>Call Station</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardSecondaryBtn, { backgroundColor: colors.sectionBg }]}
              onPress={() => handleShareStation(selectedStation)}
            >
              <Ionicons name="share-social-outline" size={16} color={colors.primary} />
              <Text style={[styles.cardSecondaryBtnText, { color: colors.primary }]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardSecondaryBtn, { backgroundColor: colors.sectionBg }]}
              onPress={() =>
                router.push({
                  pathname: "/contactDetails",
                  params: {
                    id: selectedStation.id,
                    station: selectedStation.name,
                    province: selectedStation.province,
                    district: selectedStation.district,
                    station_number: selectedStation.phone || selectedStation.station_number,
                    whatsapp_number: selectedStation.whatsapp,
                    latitude: selectedStation.latitude,
                    longitude: selectedStation.longitude,
                    address: selectedStation.address || "",
                  },
                })
              }
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.cardSecondaryBtnText, { color: colors.primary }]}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* InDrive-Style Draggable Bottom Sheet Drawer */}
      <Animated.View
        style={[
          styles.inDriveDrawer,
          {
            height: drawerHeight,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <ImageBackground source={PATTERN_BG} style={styles.drawerPatternOverlay} imageStyle={{ opacity: 0.04 }}>
          {/* Draggable Handle Bar */}
          <View style={styles.drawerHandleArea} {...panResponder.panHandlers}>
            <TouchableOpacity style={styles.drawerHandleBarWrap} onPress={toggleDrawer}>
              <View style={[styles.drawerHandleBar, { backgroundColor: colors.textMuted }]} />
            </TouchableOpacity>
            <View style={styles.drawerTitleRow}>
              <Text style={[styles.drawerHeaderTitle, { color: colors.textPrimary }]}>
                {filteredStations.length} Nearby Stations
              </Text>
              <TouchableOpacity onPress={toggleDrawer} style={styles.drawerExpandBtn}>
                <Ionicons name={drawerExpanded ? "chevron-down" : "chevron-up"} size={18} color={colors.primary} />
                <Text style={[styles.drawerExpandText, { color: colors.primary }]}>
                  {drawerExpanded ? "Collapse" : "Expand"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Drawer Station List */}
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {filteredStations.map((station) => (
                <TouchableOpacity
                  key={station.id}
                  style={[styles.drawerItem, { borderBottomColor: colors.border }]}
                  onPress={() => focusOnStation(station)}
                >
                  <Image source={ZRP_LOGO} style={styles.drawerItemLogo} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.drawerItemName, { color: colors.textPrimary }]}>{station.name || station.station}</Text>
                    <Text style={[styles.drawerItemSub, { color: colors.textMuted }]}>{station.district}, {station.province}</Text>
                  </View>
                  {station.distance !== undefined && (
                    <Text style={[styles.drawerDistText, { color: colors.primary }]}>
                      {typeof station.distance === 'number' ? station.distance.toFixed(1) : station.distance} km
                    </Text>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </ImageBackground>
      </Animated.View>
    </View>
  );
};

const styles = {
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  map: { flex: 1 },
  zrpMarkerWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2.5,
    borderColor: "#0F4C81",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  zrpMarkerWrapSelected: {
    borderColor: "#DC2626",
    transform: [{ scale: 1.18 }],
  },
  zrpMarkerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    resizeMode: "contain",
  },
  floatingHeaderContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  floatingSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 7,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  inputInnerWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  floatingInput: {
    flex: 1,
    fontSize: 14,
    color: "#0B1220",
    paddingVertical: 4,
  },
  radiusPillsScroll: {
    marginTop: 10,
  },
  floatingFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  floatingFilterPillActive: {
    backgroundColor: "#0F4C81",
    borderColor: "#0F4C81",
  },
  floatingFilterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  floatingFilterPillTextActive: {
    color: "#FFFFFF",
  },
  floatingFabContainer: {
    position: "absolute",
    bottom: 110,
    right: 16,
    zIndex: 9,
  },
  floatingFabBtn: {
    width: 46,
    height: 46,
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  floatingStationCard: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 7,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    zIndex: 10,
  },
  closeCardBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  cardLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 7,
  },
  cardInfoCol: {
    flex: 1,
  },
  cardStationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0B1220",
  },
  cardStationSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  distBadge: {
    backgroundColor: "#EAF2F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  distBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F4C81",
  },
  cardActionGrid: {
    flexDirection: "row",
    gap: 8,
  },
  cardPrimaryBtn: {
    flex: 1.3,
    height: 40,
    borderRadius: 7,
    backgroundColor: "#0F4C81",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  cardPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  cardSecondaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: 7,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cardSecondaryBtnText: {
    color: "#0F4C81",
    fontSize: 12,
    fontWeight: "600",
  },
  inDriveDrawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
    zIndex: 15,
  },
  drawerPatternOverlay: {
    flex: 1,
    paddingHorizontal: 16,
  },
  drawerHandleArea: {
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: "center",
  },
  drawerHandleBarWrap: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 4,
  },
  drawerHandleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.4,
  },
  drawerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginTop: 6,
    paddingHorizontal: 4,
  },
  drawerHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  drawerExpandBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  drawerExpandText: {
    fontSize: 12,
    fontWeight: "600",
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  drawerItemLogo: {
    width: 34,
    height: 34,
    borderRadius: 6,
  },
  drawerItemName: {
    fontSize: 14,
    fontWeight: "700",
  },
  drawerItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  drawerDistText: {
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
};

export default PoliceMap;
