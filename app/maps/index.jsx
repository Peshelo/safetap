import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Alert,
  Linking,
  Platform,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Keyboard,
  LayoutAnimation,
  PanResponder,
  StatusBar,
  Image,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import api from "../../lib/connection";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineBanner from "../components/OfflineBanner";
import { Ionicons } from "../components/Icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput, BottomSheetView } from "@gorhom/bottom-sheet";


// ─── IMPORTANT ─────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────

const { height } = Dimensions.get("window");
const DETAIL_SHEET_FRACTION = 0.42;
const STATION_PREVIEW_COUNT = 2;
const SHEET_SPRING = {
  damping: 24,
  stiffness: 260,
  mass: 0.9,
  useNativeDriver: true,
};
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#F4F6F8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#52606D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#DDE3EA" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#DCEBF3" }] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Component ─────────────────────────────────────────────────────────────────
const PoliceMap = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const mapRef = useRef(null);
  const directorySheetRef = useRef(null);
  const regionFetchTimer = useRef(null);
  const stationSearchTimer = useRef(null);
  const mapInteractionTimer = useRef(null);
  const mapDraggingRef = useRef(false);
  const detailsVisibleBeforeDrag = useRef(false);
  const sheetVisibleBeforeDrag = useRef(true);
  const searchRequestId = useRef(0);
  const lastFetchCenter = useRef(null);

  // Animation values
  const detailsSheetAnim = useRef(new Animated.Value(height)).current;
  const detailsOverlayAnim = useRef(new Animated.Value(0)).current;
  const radarAnim = useRef(new Animated.Value(0)).current;
  const centerPinLift = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef(null);

  // Core state
  const [userCoords, setUserCoords] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -17.8252,
    longitude: 31.0335,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [policeStations, setPoliceStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(true);
  const [isMapDragging, setIsMapDragging] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [nearestOffset, setNearestOffset] = useState(0);
  const [searchRadius, setSearchRadius] = useState(35);
  const [isSearchingFarther, setIsSearchingFarther] = useState(false);
  const directorySnapPoints = useMemo(() => ["40%", "92%"], []);

  const [routeCoords] = useState([]);
  const [routeSteps] = useState([]);
  const [routeSummary] = useState(null);
  const [isNavigating] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // ── Pan responders ────────────────────────────────────────────────────────
  const detailsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) detailsSheetAnim.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) closeDetailsSheet();
        else openDetailsSheet();
      },
    })
  ).current;

  // ── Data fetching from real API ───────────────────────────────────────────
  const loadStationsFromCache = async (center) => {
    const cached = await api.getCachedStations();
    const allStations = cached
      .filter((station) => isValidCoordinate(parseFloat(station.latitude), parseFloat(station.longitude)))
      .map((station) => {
        const latitude = parseFloat(station.latitude);
        const longitude = parseFloat(station.longitude);
        return {
          ...station,
          latitude,
          longitude,
          distance: center ? getDistanceFromLatLonInKm(center.latitude, center.longitude, latitude, longitude) : null,
        };
      })
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    const withinFiftyKm = allStations.filter((station) => station.distance === null || station.distance <= 50);
    const stations = withinFiftyKm.length >= 3 ? withinFiftyKm : allStations.slice(0, 3);
    setPoliceStations(stations);
    setFilteredStations(stations);
    return stations;
  };

  const fetchPoliceStations = async (center = userCoords, page = 1, radiusKm = searchRadius) => {
    try {
      if (!center) return;
      const safeRadiusKm = Math.min(Math.max(Number(radiusKm) || 35, 1), 200);
      if (policeStations.length === 0) setLoading(true);

      if (isOnline) {
        const payload = await api.nearbyStations(center.latitude, center.longitude, safeRadiusKm, page, 50);
        const records = payload.items || [];

        const stationsWithCoords = records
          .filter((s) => isValidCoordinate(parseFloat(s.latitude), parseFloat(s.longitude)))
          .map((s) => {
            const lat = parseFloat(s.latitude);
            const lng = parseFloat(s.longitude);
            return {
              id: s.id,
              station: s.station || s.name || "Police Station",
              latitude: lat,
              longitude: lng,
              phone: s.phone,
              address: s.address || "Address not available",
              description: s.description || "No description available",
              operating_hours: s.operating_hours || "24/7",
              distance: s.distance_km ?? getDistanceFromLatLonInKm(center.latitude, center.longitude, lat, lng),
            };
          })
          .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        setPoliceStations(stationsWithCoords);
        setFilteredStations(stationsWithCoords);
        lastFetchCenter.current = center;
        return stationsWithCoords;
      } else {
        await loadStationsFromCache(center);
      }
    } catch (err) {
      console.error("Failed to fetch police stations:", err);
      const cached = await loadStationsFromCache(center);
      if (!cached.length) Alert.alert("Stations unavailable", "Connect to the internet once to save the police station directory for offline use.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChangeComplete = (region) => {
    setMapRegion(region);
    if (!searchQuery.trim()) {
      const recenteredStations = policeStations
        .map((station) => ({
          ...station,
          distance: getDistanceFromLatLonInKm(region.latitude, region.longitude, station.latitude, station.longitude),
        }))
        .sort((a, b) => a.distance - b.distance);
      setPoliceStations(recenteredStations);
      setFilteredStations(recenteredStations);
    }
    if (mapDraggingRef.current) {
      clearTimeout(mapInteractionTimer.current);
      mapInteractionTimer.current = setTimeout(() => {
        mapDraggingRef.current = false;
        setIsMapDragging(false);
        Animated.spring(centerPinLift, { toValue: 0, damping: 18, stiffness: 240, useNativeDriver: true }).start();
        if (sheetVisibleBeforeDrag.current) openSheet();
        if (detailsVisibleBeforeDrag.current && selectedStation) openDetailsSheet();
        detailsVisibleBeforeDrag.current = false;
      }, 220);
    }
    if (!isOnline || isNavigating) return;
    const previous = lastFetchCenter.current;
    const movedKm = previous
      ? getDistanceFromLatLonInKm(previous.latitude, previous.longitude, region.latitude, region.longitude)
      : Infinity;
    if (movedKm < 0.25) return;
    clearTimeout(regionFetchTimer.current);
    regionFetchTimer.current = setTimeout(() => fetchPoliceStations(region), 450);
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Enable location to see nearby police stations",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          "Location Services Off",
          "Turn on device location to centre the map on your position. You can still browse and search stations manually."
        );
        await fetchPoliceStations(mapRegion);
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setUserCoords({ latitude, longitude });
      const nextRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setMapRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 650);
    } catch (err) {
      console.error("Location error:", err);
      Alert.alert(
        "Location Unavailable",
        "Your position could not be determined. You can still browse and search police stations on the map."
      );
    }
  };

  // ── Sheet helpers ─────────────────────────────────────────────────────────
  const openSheet = () => {
    setIsSheetVisible(true);
    requestAnimationFrame(() => directorySheetRef.current?.snapToIndex(isSearchExpanded ? 1 : 0));
  };

  const closeSheet = () => {
    directorySheetRef.current?.close();
  };

  const setSearchExpanded = (expanded) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearchExpanded(expanded);
    setIsSheetVisible(true);
    directorySheetRef.current?.snapToIndex(expanded ? 1 : 0);
  };

  const finishSearch = () => {
    Keyboard.dismiss();
    setSearchExpanded(false);
  };

  const cancelSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.blur();
    finishSearch();
  };

  const findNextNearest = async () => {
    const nextOffset = nearestOffset + 1;
    if (nextOffset < stationsWithValidCoords.length) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setNearestOffset(nextOffset);
      const nextStation = stationsWithValidCoords[nextOffset];
      setSelectedStation(nextStation);
      mapRef.current?.animateToRegion(
        {
          latitude: nextStation.latitude,
          longitude: nextStation.longitude,
          latitudeDelta: Math.min(mapRegion.latitudeDelta || 0.025, 0.025),
          longitudeDelta: Math.min(mapRegion.longitudeDelta || 0.025, 0.025),
        },
        550
      );
      return;
    }

    if (!isOnline || isSearchingFarther) return;
    if (searchRadius >= 200) return;
    const nextRadius = Math.min(searchRadius + 25, 200);
    setIsSearchingFarther(true);
    try {
      const stations = await fetchPoliceStations(userCoords || mapRegion, 1, nextRadius);
      setSearchRadius(nextRadius);
      if (stations?.length > nearestOffset + 1) {
        const nextStation = stations[nearestOffset + 1];
        setNearestOffset(nearestOffset + 1);
        setSelectedStation(nextStation);
        mapRef.current?.animateToRegion(
          {
            latitude: nextStation.latitude,
            longitude: nextStation.longitude,
            latitudeDelta: Math.min(mapRegion.latitudeDelta || 0.025, 0.025),
            longitudeDelta: Math.min(mapRegion.longitudeDelta || 0.025, 0.025),
          },
          550
        );
      }
    } finally {
      setIsSearchingFarther(false);
    }
  };

  const hideDrawersWhileDragging = () => {
    if (mapDraggingRef.current || isNavigating) return;
    mapDraggingRef.current = true;
    setIsMapDragging(true);
    Animated.spring(centerPinLift, { toValue: 1, damping: 16, stiffness: 260, useNativeDriver: true }).start();
    sheetVisibleBeforeDrag.current = isSheetVisible;
    detailsVisibleBeforeDrag.current = isDetailsOpen;
    closeSheet();
    if (isDetailsOpen) {
      Animated.parallel([
        Animated.timing(detailsSheetAnim, { toValue: height, duration: 160, useNativeDriver: true }),
        Animated.timing(detailsOverlayAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start();
    }
  };

  const openDetailsSheet = () => {
    setIsDetailsOpen(true);
    Animated.parallel([
      Animated.spring(detailsSheetAnim, {
        toValue: 0,
        ...SHEET_SPRING,
      }),
      Animated.timing(detailsOverlayAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDetailsSheet = ({ clearSelection = true, restoreDirectory = true } = {}) => {
    Animated.parallel([
      Animated.spring(detailsSheetAnim, {
        toValue: height,
        ...SHEET_SPRING,
      }),
      Animated.timing(detailsOverlayAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setIsDetailsOpen(false);
      if (clearSelection) setSelectedStation(null);
      if (restoreDirectory) openSheet();
    });
  };

  // ── In-app Navigation using Directions API ─────────────────────────────────
  const handleNavigate = async (station) => {
    if (!isValidCoordinate(station.latitude, station.longitude)) {
      Alert.alert("Navigation unavailable", "This station does not have a valid map location.");
      return;
    }

    const destination = `${station.latitude},${station.longitude}`;
    const nativeUrl = Platform.OS === "ios"
      ? `maps://?daddr=${destination}&dirflg=d`
      : `google.navigation:q=${destination}&mode=d`;
    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    try {
      const canOpenNativeMaps = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpenNativeMaps ? nativeUrl : fallbackUrl);
    } catch {
      Alert.alert("Navigation unavailable", "Could not open a maps application on this device.");
    }
  };

  const cancelNavigation = () => openSheet();

  // ── Other actions ─────────────────────────────────────────────────────────
  const handleCall = (station) => {
    const phoneNumber = station.phone?.replace(/[^\d+]/g, "");
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(() =>
        Alert.alert("Error", "Could not make the call")
      );
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  };

  const focusOnStation = (station) => {
    if (!isValidCoordinate(station.latitude, station.longitude)) {
      Alert.alert("Location Error", "This station has invalid location data.");
      return;
    }
    setSelectedStation(station);
    closeSheet();
    if (mapRef.current) {
      const latitudeDelta = Math.min(mapRegion.latitudeDelta || 0.025, 0.025);
      const longitudeDelta = Math.min(mapRegion.longitudeDelta || 0.025, 0.025);
      mapRef.current.animateToRegion(
        {
          // Keep the marker centred in the visible map above the detail drawer.
          latitude: station.latitude - latitudeDelta * (DETAIL_SHEET_FRACTION / 2),
          longitude: station.longitude,
          latitudeDelta,
          longitudeDelta,
        },
        500
      );
    }
    openDetailsSheet();
  };

  const focusOnUser = () => {
    if (userCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userCoords, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
        500
      );
    }
  };

  const calculateStationDistance = (station) => {
    if (!userCoords || !isValidCoordinate(station.latitude, station.longitude))
      return null;
    return getDistanceFromLatLonInKm(
      userCoords.latitude,
      userCoords.longitude,
      station.latitude,
      station.longitude
    );
  };

  const getManeuverIcon = (maneuver) => {
    const map = {
      "turn-left": "turn-left",
      "turn-right": "turn-right",
      "turn-sharp-left": "turn-left",
      "turn-sharp-right": "turn-right",
      "turn-slight-left": "turn-left",
      "turn-slight-right": "turn-right",
      "uturn-left": "u-turn-left",
      "uturn-right": "u-turn-right",
      "roundabout": "rotate-right",
      straight: "straight",
      merge: "merge",
      ramp: "call-merge",
    };
    return map[maneuver] ?? "arrow-forward";
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (userCoords) fetchPoliceStations();
  }, [userCoords, isOnline]);

  useEffect(() => () => {
    clearTimeout(regionFetchTimer.current);
    clearTimeout(stationSearchTimer.current);
    clearTimeout(mapInteractionTimer.current);
  }, []);

  useEffect(() => {
    const keyboardListener = Keyboard.addListener("keyboardDidHide", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSearchExpanded(false);
    });
    return () => keyboardListener.remove();
  }, []);

  useEffect(() => {
    if (!isSearchingFarther) {
      radarAnim.stopAnimation();
      radarAnim.setValue(0);
      return;
    }
    const pulse = Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    pulse.start();
    return () => pulse.stop();
  }, [isSearchingFarther, radarAnim]);

  useEffect(() => {
    clearTimeout(stationSearchTimer.current);
    const query = searchQuery.trim();
    setNearestOffset(0);
    if (!query) {
      searchRequestId.current += 1;
      setFilteredStations(policeStations);
      return;
    }

    const requestId = ++searchRequestId.current;
    stationSearchTimer.current = setTimeout(async () => {
      try {
        let results;
        if (isOnline) {
          const response = await api.collection("contacts").getList(1, 100, {
            filter: `station ~ "${query.replace(/["\\]/g, "")}"`,
          });
          results = response.items;
        } else {
          const q = query.toLowerCase();
          results = (await api.getCachedStations()).filter((station) =>
            [station.station, station.province, station.district, station.phone, station.whatsapp]
              .some((value) => String(value || "").toLowerCase().includes(q))
          );
        }

        if (requestId !== searchRequestId.current) return;
        const center = userCoords || mapRegion;
        setFilteredStations(results
          .filter((station) => isValidCoordinate(station.latitude, station.longitude))
          .map((station) => {
            const latitude = parseFloat(station.latitude);
            const longitude = parseFloat(station.longitude);
            return {
              ...station,
              station: station.station || station.name || "Police Station",
              latitude,
              longitude,
              phone: station.phone,
              address: station.address || `${station.district || ""}, ${station.province || ""}`.replace(/^, |, $/g, ""),
              distance: getDistanceFromLatLonInKm(center.latitude, center.longitude, latitude, longitude),
            };
          })
          .sort((a, b) => a.distance - b.distance));
      } catch (error) {
        if (requestId === searchRequestId.current) setFilteredStations([]);
        console.error("Station directory search failed", error);
      }
    }, 300);

    return () => clearTimeout(stationSearchTimer.current);
  }, [searchQuery, policeStations, isOnline, userCoords]);

  const stationsWithValidCoords = filteredStations.filter((s) =>
    isValidCoordinate(s.latitude, s.longitude)
  );
  const nearestStationPreview = isSearchExpanded
    ? stationsWithValidCoords
    : stationsWithValidCoords.slice(nearestOffset, nearestOffset + STATION_PREVIEW_COUNT);

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderStationCard = (station, index) => {
    const isSelected = selectedStation?.id === station.id;
    const distance = station.distance ?? calculateStationDistance(station);

    return (
      <TouchableOpacity
        key={station.id || index}
        style={[
          styles.stationCard,
          isSelected && styles.stationCardSelected,
        ]}
        onPress={() => focusOnStation(station)}
        activeOpacity={0.7}
      >
        <View style={styles.stationCardInner}>
          <View style={[styles.stationIcon, isSelected && styles.stationIconSelected]}>
            <Image source={require("../../assets/images/logo-alternate.png")} style={styles.stationLogoImage} />
          </View>

          <View style={styles.stationInfo}>
            <View style={styles.stationHeader}>
              <Text style={styles.stationName} numberOfLines={1}>
                {station.station}
              </Text>
              {distance !== null && (
                <Text style={styles.stationDistance}>
                  {distance.toFixed(1)} km
                </Text>
              )}
            </View>

            <View style={styles.stationAddress}>
              <Ionicons name="location-on" size={14} color="#6B7280" />
              <Text style={styles.stationAddressText} numberOfLines={1}>
                {station.address}
              </Text>
            </View>

          </View>
          <Ionicons name="chevron-forward" size={19} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  // ── Navigation Panel (step-by-step directions) ───────────────────────────
  const NavigationPanel = () => (
    <View style={[styles.navigationPanel, { bottom: insets.bottom }]}>
      <View style={styles.sheetHandle}>
        <View style={styles.sheetHandleBar} />
      </View>

      {/* Current step highlight */}
      {routeSteps.length > 0 && (
        <View style={styles.currentStep}>
          <View style={styles.currentStepIcon}>
            <Ionicons
              name={getManeuverIcon(routeSteps[activeStepIndex]?.maneuver)}
              size={24}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.currentStepContent}>
            <Text style={styles.currentStepInstruction} numberOfLines={2}>
              {routeSteps[activeStepIndex]?.instruction}
            </Text>
            <Text style={styles.currentStepMeta}>
              {routeSteps[activeStepIndex]?.distance} · {routeSteps[activeStepIndex]?.duration}
            </Text>
          </View>
          <View style={styles.stepNavigation}>
            <TouchableOpacity
              disabled={activeStepIndex === 0}
              onPress={() => setActiveStepIndex((i) => Math.max(i - 1, 0))}
              style={[styles.stepNavButton, activeStepIndex === 0 && styles.stepNavButtonDisabled]}
            >
              <Ionicons name="chevron-left" size={24} color={activeStepIndex === 0 ? "#D1D5DB" : "#3B82F6"} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={activeStepIndex === routeSteps.length - 1}
              onPress={() => setActiveStepIndex((i) => Math.min(i + 1, routeSteps.length - 1))}
              style={[styles.stepNavButton, activeStepIndex === routeSteps.length - 1 && styles.stepNavButtonDisabled]}
            >
              <Ionicons name="chevron-right" size={24} color={activeStepIndex === routeSteps.length - 1 ? "#D1D5DB" : "#3B82F6"} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Summary */}
      {routeSummary && (
        <View style={styles.routeSummary}>
          <View style={styles.summaryItem}>
            <Ionicons name="straighten" size={16} color="#6B7280" />
            <Text style={styles.summaryText}>{routeSummary.distance}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="schedule" size={16} color="#6B7280" />
            <Text style={styles.summaryText}>{routeSummary.duration}</Text>
          </View>
        </View>
      )}

      {/* All steps list */}
      <ScrollView style={styles.stepsList} showsVerticalScrollIndicator={false}>
        {routeSteps.map((step, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setActiveStepIndex(i)}
            style={[
              styles.stepItem,
              i === activeStepIndex && styles.stepItemActive,
            ]}
          >
            <View style={[styles.stepIcon, i === activeStepIndex && styles.stepIconActive]}>
              <Ionicons
                name={getManeuverIcon(step.maneuver)}
                size={16}
                color={i === activeStepIndex ? "#FFFFFF" : "#6B7280"}
              />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepInstruction, i === activeStepIndex && styles.stepInstructionActive]}>
                {step.instruction}
              </Text>
              <Text style={styles.stepMeta}>
                {step.distance} · {step.duration}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Destination reached */}
        <View style={styles.destinationItem}>
          <View style={styles.destinationIcon}>
            <Image source={require("../../assets/images/logo-alternate.png")} style={styles.destinationLogoImage} />
          </View>
          <Text style={styles.destinationText}>
            {selectedStation?.station ?? "Destination"}
          </Text>
        </View>
      </ScrollView>

      {/* Cancel button */}
      <TouchableOpacity style={styles.cancelButton} onPress={cancelNavigation}>
        <Text style={styles.cancelButtonText}>Cancel Navigation</Text>
      </TouchableOpacity>
    </View>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mapContainer}>
        {/* Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          onPanDrag={hideDrawersWhileDragging}
          onRegionChangeComplete={handleRegionChangeComplete}
          customMapStyle={MAP_STYLE}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={false}
          moveOnMarkerPress={false}
        >
          {/* Station markers */}
          {!isNavigating && stationsWithValidCoords.map((station, index) => {
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
                <View style={[styles.marker, isSelected && styles.markerSelected]}>
                  <Image source={require("../../assets/images/logo-alternate.png")} style={styles.markerLogoImage} />
                </View>
                                  <View style={styles.markerPoint}><View style={styles.markerPointCenter} /></View>

              </Marker>
            );
          })}

          {/* Route polyline */}
          {isNavigating && routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#3B82F6"
              strokeWidth={5}
              lineDashPattern={[0]}
            />
          )}
        </MapView>

        {!isNavigating && !isDetailsOpen && !isSearchExpanded && (
          <View pointerEvents="none" style={styles.centerPointLayer}>
            <Animated.View
              style={[
                styles.centerPointContent,
                {
                  transform: [
                    { translateY: centerPinLift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
                    { scale: centerPinLift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
                  ],
                },
              ]}
            >
              <View style={styles.centerPointLabel}>
                <Text style={styles.centerPointEyebrow}>SEARCH POINT</Text>
                <Text style={styles.centerPointName} numberOfLines={1}>
                  {isMapDragging ? "Move map to choose" : nearestStationPreview[0]?.station || "Finding nearest station"}
                </Text>
              </View>
              <View style={styles.centerPinHead}>
                <View style={styles.centerPinCore} />
              </View>
              <View style={styles.centerPinStem} />
              <Animated.View
                style={[
                  styles.centerPinShadow,
                  {
                    opacity: centerPinLift.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.08] }),
                    transform: [{ scale: centerPinLift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }],
                  },
                ]}
              />
            </Animated.View>
          </View>
        )}

        {/* Minimal floating map controls */}
        <View style={[styles.headerOverlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.header}>
            <View style={styles.headerCard}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  if (isNavigating) cancelNavigation();
                  else router.back();
                }}
              >
                <Ionicons name={isNavigating ? "close" : "chevron-back"} size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerLogo}>
                <Image source={require("../../assets/images/logo-alternate.png")} style={styles.headerLogoImage} />
              </View>
              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>{isNavigating ? "Navigation" : "Police stations"}</Text>
                <Text style={styles.headerSubtitle}>{isNavigating ? "Route guidance" : "Nearby and ready to help"}</Text>
              </View>
            </View>
          </View>

        </View>

        {!isNavigating && (
          <TouchableOpacity
            style={[
              styles.floatingLocateButton,
              {
                bottom:
                  insets.bottom +
                  (isDetailsOpen ? height * DETAIL_SHEET_FRACTION + 16 : isSheetVisible ? height * 0.4 + 16 : 86),
              },
            ]}
            onPress={focusOnUser}
            accessibilityRole="button"
            accessibilityLabel="Centre map on my location"
          >
            <Ionicons name="target" size={24} color="#1E3A8A" />
          </TouchableOpacity>
        )}

        {!isOnline && <OfflineBanner />}

        {/* Bottom Sheet - Only show when not navigating */}
        {!isNavigating && !isDetailsOpen && (
          <BottomSheet
            ref={directorySheetRef}
            index={0}
            snapPoints={directorySnapPoints}
            enablePanDownToClose
            enableDynamicSizing={false}
            bottomInset={insets.bottom}
            keyboardBehavior="extend"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            onChange={(index) => {
              setIsSheetVisible(index >= 0);
              const expanded = index === 1;
              if (expanded !== isSearchExpanded) setIsSearchExpanded(expanded);
            }}
            onClose={() => {
              setIsSheetVisible(false);
              setIsSearchExpanded(false);
              Keyboard.dismiss();
            }}
            backgroundStyle={styles.bottomSheetBackground}
            handleIndicatorStyle={styles.bottomSheetIndicator}
          >
            <BottomSheetView style={styles.sheetContent}>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={23} color="#111827" />
                <BottomSheetTextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Search station or district"
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => setSearchExpanded(true)}
                  onSubmitEditing={finishSearch}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityLabel="Clear station search">
                    <Ionicons name="close-circle" size={20} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                {isSearchExpanded && (
                  <TouchableOpacity onPress={cancelSearch} accessibilityLabel="Cancel station search">
                    <Text style={styles.searchCancelText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>{searchQuery ? "Search results" : "Nearest stations"}</Text>
                  <Text style={styles.sheetSubtitle}>
                    {filteredStations.length} total · {stationsWithValidCoords.length} on map
                  </Text>
                </View>
                {!searchQuery && !isSearchExpanded && (
                  <TouchableOpacity
                    style={styles.nextNearestButton}
                    onPress={findNextNearest}
                    disabled={isSearchingFarther || (searchRadius >= 200 && nearestOffset + 1 >= stationsWithValidCoords.length)}
                    accessibilityLabel="Find the next nearest police station"
                  >
                    <View style={styles.radarIcon}>
                      {isSearchingFarther && (
                        <Animated.View
                          style={[
                            styles.radarWave,
                            {
                              opacity: radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }),
                              transform: [{ scale: radarAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.8] }) }],
                            },
                          ]}
                        />
                      )}
                      <Ionicons name="radio-outline" size={15} color="#1E3A8A" />
                    </View>
                    <Text style={styles.nextNearestText}>
                      {isSearchingFarther
                        ? "Looking…"
                        : searchRadius >= 200 && nearestOffset + 1 >= stationsWithValidCoords.length
                          ? "No more nearby"
                          : "Next nearest"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {loading ? (
                <View style={styles.stationSkeletonList}>
                  {[0, 1].map((item) => (
                    <View key={item} style={styles.stationSkeletonCard}>
                      <View style={styles.stationSkeletonLogo} />
                      <View style={styles.stationSkeletonBody}>
                        <View style={[styles.stationSkeletonLine, { width: "58%" }]} />
                        <View style={[styles.stationSkeletonLine, styles.stationSkeletonLineSmall, { width: "82%" }]} />
                        <View style={[styles.stationSkeletonLine, styles.stationSkeletonLineSmall, { width: "42%" }]} />
                      </View>
                    </View>
                  ))}
                </View>
              ) : filteredStations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="location-off" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No police stations found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try a different search term"
                      : "No stations available in your area"}
                  </Text>
                </View>
              ) : (
                <BottomSheetFlatList
                  data={nearestStationPreview}
                  keyExtractor={(station, index) => String(station.id || index)}
                  renderItem={({ item, index }) => renderStationCard(item, index)}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.stationsList}
                />
              )}
            </BottomSheetView>
          </BottomSheet>
        )}

        {!isNavigating && !isSheetVisible && !isDetailsOpen && !isMapDragging && (
          <TouchableOpacity
            style={[styles.drawerPeek, { bottom: insets.bottom + 14 }]}
            onPress={openSheet}
            accessibilityRole="button"
            accessibilityLabel="Show nearby stations"
          >
            <View style={styles.drawerPeekLogo}>
              <Image source={require("../../assets/images/logo-alternate.png")} style={styles.drawerPeekLogoImage} />
            </View>
            <Text style={styles.drawerPeekText}>Nearby stations</Text>
            <Ionicons name="chevron-up" size={20} color="#1E3A8A" />
          </TouchableOpacity>
        )}

        {/* Navigation Panel - Show when navigating */}
        {isNavigating && <NavigationPanel />}

        {/* Station Detail Sheet */}
        {!isNavigating && isDetailsOpen && selectedStation && (
          <Animated.View
            style={[
              styles.detailSheet,
              {
                bottom: insets.bottom,
                transform: [{ translateY: detailsSheetAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.sheetHandle}
              onPress={() => closeDetailsSheet()}
              accessibilityRole="button"
              accessibilityLabel="Close station details"
              {...detailsPanResponder.panHandlers}
            >
              <View style={styles.sheetHandleBar} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailContent}>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <View style={styles.detailIcon}>
                    <Image source={require("../../assets/images/logo-alternate.png")} style={styles.detailLogoImage} />
                  </View>
                  <View style={styles.detailHeaderInfo}>
                    <Text style={styles.detailTitle}>{selectedStation.station}</Text>
                    <View style={styles.detailAddress}>
                      <Ionicons name="location-on" size={16} color="#6B7280" />
                      <Text style={styles.detailAddressText}>
                        {selectedStation.address}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.detailCloseButton} onPress={() => closeDetailsSheet()} accessibilityLabel="Close station details">
                    <Ionicons name="close" size={20} color="#475569" />
                  </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.navigateButton]}
                    onPress={() => handleNavigate(selectedStation)}
                  >
                    <Ionicons name="open-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Open Maps</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.callButton]}
                    onPress={() => handleCall(selectedStation)}
                    disabled={!selectedStation.phone}
                  >
                    <Ionicons name="phone" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                </View>

                {/* Details */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Station Details</Text>

                  {selectedStation.phone && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconSmall}>
                        <Ionicons name="phone" size={18} color="#3B82F6" />
                      </View>
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Phone Number</Text>
                        <Text style={styles.detailValue}>{selectedStation.phone}</Text>
                      </View>
                    </View>
                  )}

                  {userCoords && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconSmall}>
                        <Ionicons name="directions" size={18} color="#EF4444" />
                      </View>
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Distance</Text>
                        <Text style={styles.detailValue}>
                          {calculateStationDistance(selectedStation)?.toFixed(1) ?? "N/A"} km away
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedStation.operating_hours && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconSmall}>
                        <Ionicons name="schedule" size={18} color="#10B981" />
                      </View>
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Operating Hours</Text>
                        <Text style={styles.detailValue}>{selectedStation.operating_hours}</Text>
                      </View>
                    </View>
                  )}

                  {selectedStation.description && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconSmall}>
                        <Ionicons name="info" size={18} color="#8B5CF6" />
                      </View>
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailDescription}>{selectedStation.description}</Text>
                      </View>
                    </View>
                  )}
                </View>

              </View>
            </ScrollView>
          </Animated.View>
        )}

      </View>
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  // Header with faint background
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#1E3A8A",
    borderRadius: 24,
    padding: 5,
    paddingRight: 16,
    elevation: 7,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginLeft: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerLogoImage: { width: 29, height: 29, resizeMode: "contain" },
  headerCopy: { marginLeft: 10 },
  headerTitle: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: { marginTop: 1, fontSize: 11, color: "#BFDBFE" },
  keyboardAvoider: {
    flex: 1,
  },
  floatingLocateButton: {
    position: "absolute",
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 9,
  },
  centerPointLayer: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    alignItems: "center",
    zIndex: 8,
  },
  centerPointContent: {
    position: "absolute",
    bottom: -5,
    alignItems: "center",
  },
  centerPointLabel: {
    maxWidth: 190,
    minWidth: 132,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginBottom: 6,
    elevation: 5,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
  },
  centerPointEyebrow: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.7,
  },
  centerPointName: {
    marginTop: 1,
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  centerPinHead: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  centerPinCore: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
  },
  centerPinStem: {
    width: 3,
    height: 15,
    backgroundColor: "#2563EB",
  },
  centerPinShadow: {
    width: 8,
    height: 4,
    borderRadius: 9,
    backgroundColor: "#0F172A",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4F4F6",
    borderRadius: 18,
    paddingHorizontal: 17,
    height: 58,
    gap: 11,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: "#111827",
  },
  searchCancelText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  // Bottom Sheet
  bottomSheetBackground: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  bottomSheetIndicator: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: height * 0.92,
  },
  drawerPeek: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 14,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    elevation: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  drawerPeekLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerPeekLogoImage: { width: 30, height: 30, resizeMode: "contain" },
  drawerPeekText: {
    flex: 1,
    marginLeft: 11,
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetHandleBar: {
    width: 44,
    height: 5,
    backgroundColor: "#CBD5E1",
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  sheetHeader: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nextNearestButton: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  nextNearestText: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  radarIcon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  radarWave: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#9a706d",
    backgroundColor: "#DBEAFE",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  stationsList: {
    flex: 1,
  },
  // Station Card
  stationCard: {
    backgroundColor: "#F7F7F8",
    borderRadius: 16,
    marginBottom: 8,
    padding: 11,
    borderWidth: 1,
    borderColor: "#EFEFF1",
  },
  stationCardSelected: {
    backgroundColor: "#E8EEF9",
  },
  stationCardInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stationIconSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#1E3A8A",
    borderWidth: 2,
  },
  stationInfo: {
    flex: 1,
  },
  stationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  stationName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  stationDistance: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  stationAddress: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  stationAddressText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
    flex: 1,
  },
  stationPhone: {
    flexDirection: "row",
    alignItems: "center",
  },
  stationPhoneText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginLeft: 4,
  },
  // Markers
  userMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  userMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 5,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  markerSelected: {
    width: 40,
    height: 40,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#1E3A8A",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1E3A8A",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  markerLogoImage: { width: "100%", height: "100%", resizeMode: "contain" },
  markerPoint: { position: "absolute", right: -5, bottom: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: "#bf8902", zIndex: 1, borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  markerPointCenter: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#FFFFFF" },
  stationLogoImage: { width: 31, height: 31, resizeMode: "contain" },
  detailLogoImage: { width: 46, height: 46, resizeMode: "contain" },
  destinationLogoImage: { width: 21, height: 21, resizeMode: "contain" },
  markerDot: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  // Navigation Panel
  navigationPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    maxHeight: height * 0.6,
    paddingBottom: Platform.OS === "ios" ? 20 : 16,
  },
  currentStep: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  currentStepIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  currentStepContent: {
    flex: 1,
  },
  currentStepInstruction: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E3A8A",
    lineHeight: 20,
  },
  currentStepMeta: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 4,
  },
  stepNavigation: {
    flexDirection: "row",
    marginLeft: 8,
  },
  stepNavButton: {
    padding: 6,
  },
  stepNavButtonDisabled: {
    opacity: 0.5,
  },
  routeSummary: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginHorizontal: 16,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  stepsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  stepItemActive: {
    backgroundColor: "#F0F9FF",
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepIconActive: {
    backgroundColor: "#1d50a3",
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  stepInstructionActive: {
    fontWeight: "600",
    color: "#1F2937",
  },
  stepMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  destinationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  destinationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  destinationText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 14,
  },
  // Detail Sheet
  detailSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 24,
    maxHeight: height * DETAIL_SHEET_FRACTION,
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  detailAddress: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailAddressText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 4,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  navigateButton: {
    backgroundColor: "#3B82F6",
  },
  callButton: {
    backgroundColor: "#10B981",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  detailsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  detailIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailRowContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  detailDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  emergencySection: {
    marginTop: 8,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  emergencySubtitle: {
    fontSize: 11,
    color: "#FCA5A5",
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
  },
  stationSkeletonList: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  stationSkeletonCard: { minHeight: 92, padding: 14, flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFFFFF" },
  stationSkeletonLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#E5E7EB", marginRight: 12 },
  stationSkeletonBody: { flex: 1, gap: 9 },
  stationSkeletonLine: { height: 12, borderRadius: 6, backgroundColor: "#E5E7EB" },
  stationSkeletonLineSmall: { height: 9, backgroundColor: "#F1F5F9" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
};

export default PoliceMap;
