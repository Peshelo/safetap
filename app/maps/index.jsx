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
  Animated,
  Dimensions,
  ScrollView,
  PanResponder,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import pb from "../../lib/connection";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineBanner from "../components/OfflineBanner";
import {
  FontAwesome5,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { Image } from "react-native";

// ─── IMPORTANT ─────────────────────────────────────────────────────────────────
// Replace with your actual Google Maps API key with Directions API enabled
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";
// ────────────────────────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get("window");

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

const decodePolyline = (encoded) => {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

const stripHtml = (html) => html?.replace(/<[^>]*>/g, "") ?? "";

// ── Component ─────────────────────────────────────────────────────────────────
const PoliceMap = () => {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const mapRef = useRef(null);

  // Animation values
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const detailsSheetAnim = useRef(new Animated.Value(height)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const detailsOverlayAnim = useRef(new Animated.Value(0)).current;

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
  const [isSheetOpen, setIsSheetOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Navigation state
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // ── Pan responders ────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetAnim.setValue(Math.min(g.dy, 300));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) closeSheet();
        else openSheet();
      },
    })
  ).current;

  const detailsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0)
          detailsSheetAnim.setValue(Math.max(height - 600 + g.dy, 0));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) closeDetailsSheet();
        else openDetailsSheet();
      },
    })
  ).current;

  // ── Data fetching from real API ───────────────────────────────────────────
  const fetchPoliceStations = async () => {
    try {
      setLoading(true);
      
      if (isOnline) {
        const records = await pb.collection("contacts").getFullList({
          sort: "-created",
        });
        
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
              station_number: s.station_number || s.phone,
              address: s.address || "Address not available",
              description: s.description || "No description available",
              operating_hours: s.operating_hours || "24/7",
              distance: userCoords
                ? getDistanceFromLatLonInKm(
                    userCoords.latitude,
                    userCoords.longitude,
                    lat,
                    lng
                  )
                : null,
            };
          })
          .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        setPoliceStations(stationsWithCoords);
        setFilteredStations(stationsWithCoords);
      } else {
        Alert.alert("Offline", "Unable to fetch stations. Please check your connection.");
      }
    } catch (err) {
      console.error("Failed to fetch police stations:", err);
      Alert.alert("Error", "Failed to load police stations");
    } finally {
      setLoading(false);
    }
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
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      setUserCoords({ latitude, longitude });
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (err) {
      console.error("Location error:", err);
    }
  };

  // ── Sheet helpers ─────────────────────────────────────────────────────────
  const openSheet = () => {
    setIsSheetOpen(true);
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 0,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSheet = () => {
    Animated.parallel([
      Animated.spring(sheetAnim, {
        toValue: 300,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsSheetOpen(false));
  };

  const openDetailsSheet = () => {
    setIsDetailsOpen(true);
    Animated.parallel([
      Animated.spring(detailsSheetAnim, {
        toValue: height - 600,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(detailsOverlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDetailsSheet = () => {
    Animated.parallel([
      Animated.spring(detailsSheetAnim, {
        toValue: height,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(detailsOverlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsDetailsOpen(false);
      setSelectedStation(null);
    });
  };

  // ── In-app Navigation using Directions API ─────────────────────────────────
  const handleNavigate = async (station) => {
    if (!isValidCoordinate(station.latitude, station.longitude)) {
      Alert.alert("Navigation Error", "Cannot navigate — invalid station location.");
      return;
    }
    if (!userCoords) {
      Alert.alert("Navigation Error", "Your location is not available yet.");
      return;
    }

    setNavLoading(true);
    try {
      const origin = `${userCoords.latitude},${userCoords.longitude}`;
      const destination = `${station.latitude},${station.longitude}`;
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${origin}&destination=${destination}` +
        `&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.routes?.length) {
        Alert.alert(
          "Route Error",
          `Could not fetch route: ${data.status}. Please check your API key.`
        );
        return;
      }

      const leg = data.routes[0].legs[0];
      const encodedPolyline = data.routes[0].overview_polyline.points;
      const decoded = decodePolyline(encodedPolyline);

      // Build step list
      const steps = leg.steps.map((step, i) => ({
        index: i,
        instruction: stripHtml(step.html_instructions),
        distance: step.distance?.text ?? "",
        duration: step.duration?.text ?? "",
        maneuver: step.maneuver ?? "",
        startLocation: step.start_location,
        endLocation: step.end_location,
      }));

      setRouteCoords(decoded);
      setRouteSteps(steps);
      setRouteSummary({
        distance: leg.distance?.text,
        duration: leg.duration?.text,
      });
      setActiveStepIndex(0);
      setIsNavigating(true);

      // Close details sheet, keep station selected
      closeDetailsSheet();

      // Fit map to show the whole route
      if (mapRef.current && decoded.length > 0) {
        mapRef.current.fitToCoordinates(decoded, {
          edgePadding: { top: 120, right: 40, bottom: 300, left: 40 },
          animated: true,
        });
      }
    } catch (err) {
      console.error("Directions fetch error:", err);
      Alert.alert(
        "Navigation Error",
        "Failed to fetch route. Check your internet connection."
      );
    } finally {
      setNavLoading(false);
    }
  };

  const cancelNavigation = () => {
    setIsNavigating(false);
    setRouteCoords([]);
    setRouteSteps([]);
    setRouteSummary(null);
    setActiveStepIndex(0);
    
    // Reset map to show user location
    if (userCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        { ...userCoords, latitudeDelta: 0.0922, longitudeDelta: 0.0421 },
        500
      );
    }
  };

  // ── Other actions ─────────────────────────────────────────────────────────
  const handleCall = (station) => {
    const phoneNumber = station.station_number?.replace(/[^\d+]/g, "");
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
    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: station.latitude,
          longitude: station.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
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
            s.description?.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, policeStations]);

  const stationsWithValidCoords = filteredStations.filter((s) =>
    isValidCoordinate(s.latitude, s.longitude)
  );

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderStationCard = (station, index) => {
    const isSelected = selectedStation?.id === station.id;
    const distance = calculateStationDistance(station);

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
            <FontAwesome5 name="shield-alt" size={20} color="#FFFFFF" />
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
              <MaterialIcons name="location-on" size={14} color="#6B7280" />
              <Text style={styles.stationAddressText} numberOfLines={1}>
                {station.address}
              </Text>
            </View>

            {station.station_number && (
              <View style={styles.stationPhone}>
                <MaterialIcons name="phone" size={12} color="#6B7280" />
                <Text style={styles.stationPhoneText}>{station.station_number}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Navigation Panel (step-by-step directions) ───────────────────────────
  const NavigationPanel = () => (
    <View style={styles.navigationPanel}>
      <View style={styles.sheetHandle}>
        <View style={styles.sheetHandleBar} />
      </View>

      {/* Current step highlight */}
      {routeSteps.length > 0 && (
        <View style={styles.currentStep}>
          <View style={styles.currentStepIcon}>
            <MaterialIcons
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
              <MaterialIcons name="chevron-left" size={24} color={activeStepIndex === 0 ? "#D1D5DB" : "#3B82F6"} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={activeStepIndex === routeSteps.length - 1}
              onPress={() => setActiveStepIndex((i) => Math.min(i + 1, routeSteps.length - 1))}
              style={[styles.stepNavButton, activeStepIndex === routeSteps.length - 1 && styles.stepNavButtonDisabled]}
            >
              <MaterialIcons name="chevron-right" size={24} color={activeStepIndex === routeSteps.length - 1 ? "#D1D5DB" : "#3B82F6"} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Summary */}
      {routeSummary && (
        <View style={styles.routeSummary}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="straighten" size={16} color="#6B7280" />
            <Text style={styles.summaryText}>{routeSummary.distance}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="schedule" size={16} color="#6B7280" />
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
              <MaterialIcons
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
            <FontAwesome5 name="shield-alt" size={14} color="#FFFFFF" />
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.mapContainer}>
        {/* Map */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={false}
        >
          {/* User marker */}
          {userCoords && (
            <Marker coordinate={userCoords}>
              <View style={styles.userMarker}>
                <View style={styles.userMarkerDot} />
              </View>
            </Marker>
          )}

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
                  <View style={styles.markerDot} />
                </View>
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

        {/* Header with faint background */}
        <View style={styles.headerOverlay}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                if (isNavigating) cancelNavigation();
                else router.back();
              }}
            >
              <Ionicons name={isNavigating ? "close" : "arrow-back"} size={24} color="#1F2937" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {isNavigating ? "Navigation" : "Police Stations"}
              </Text>
              {!isNavigating && (
                <Text style={styles.headerSubtitle}>
                  {stationsWithValidCoords.length} stations nearby
                </Text>
              )}
            </View>

            {!isNavigating && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={focusOnUser}
              >
                <MaterialCommunityIcons name="target" size={24} color="#1F2937" />
              </TouchableOpacity>
            )}
            {isNavigating && <View style={styles.headerButton} />}
          </View>

          {/* Search Bar - hidden while navigating */}
          {!isNavigating && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search police stations..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {!isOnline && <OfflineBanner />}

        {/* Bottom Sheet - Only show when not navigating */}
        {!isNavigating && (
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: sheetAnim }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.sheetHandle}>
              <View style={styles.sheetHandleBar} />
            </View>

            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Police Stations</Text>
                <Text style={styles.sheetSubtitle}>
                  {filteredStations.length} total · {stationsWithValidCoords.length} on map
                </Text>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1E3A8A" />
                  <Text style={styles.loadingText}>Loading stations...</Text>
                </View>
              ) : filteredStations.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="location-off" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No police stations found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try a different search term"
                      : "No stations available in your area"}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.stationsList}
                >
                  {filteredStations.map((station, index) =>
                    renderStationCard(station, index)
                  )}
                </ScrollView>
              )}
            </View>
          </Animated.View>
        )}

        {/* Navigation Panel - Show when navigating */}
        {isNavigating && <NavigationPanel />}

        {/* Station Detail Sheet */}
        {!isNavigating && isDetailsOpen && selectedStation && (
          <Animated.View
            style={[
              styles.detailSheet,
              {
                transform: [{ translateY: detailsSheetAnim }],
              },
            ]}
            {...detailsPanResponder.panHandlers}
          >
            <View style={styles.sheetHandle}>
              <View style={styles.sheetHandleBar} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailContent}>
                {/* Header */}
                <View style={styles.detailHeader}>
                  <View style={styles.detailIcon}>
                    <FontAwesome5 name="shield-alt" size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.detailHeaderInfo}>
                    <Text style={styles.detailTitle}>{selectedStation.station}</Text>
                    <View style={styles.detailAddress}>
                      <MaterialIcons name="location-on" size={16} color="#6B7280" />
                      <Text style={styles.detailAddressText}>
                        {selectedStation.address}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.navigateButton]}
                    onPress={() => handleNavigate(selectedStation)}
                    disabled={navLoading}
                  >
                    {navLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="navigation" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Navigate</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.callButton]}
                    onPress={() => handleCall(selectedStation)}
                    disabled={!selectedStation.station_number}
                  >
                    <MaterialIcons name="phone" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Call</Text>
                  </TouchableOpacity>
                </View>

                {/* Details */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Station Details</Text>
                  
                  {selectedStation.station_number && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconSmall}>
                        <MaterialIcons name="phone" size={18} color="#3B82F6" />
                      </View>
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Phone Number</Text>
                        <Text style={styles.detailValue}>{selectedStation.station_number}</Text>
                      </View>
                    </View>
                  )}

                  {userCoords && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconSmall}>
                        <MaterialIcons name="directions" size={18} color="#EF4444" />
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
                        <MaterialIcons name="schedule" size={18} color="#10B981" />
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
                        <MaterialIcons name="info" size={18} color="#8B5CF6" />
                      </View>
                      <View style={styles.detailRowContent}>
                        <Text style={styles.detailLabel}>Description</Text>
                        <Text style={styles.detailDescription}>{selectedStation.description}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Emergency Actions */}
                <View style={styles.emergencySection}>
                  <Text style={styles.sectionTitle}>Emergency Actions</Text>
                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={() => router.push("/emergency")}
                  >
                    <View style={styles.emergencyIcon}>
                      <MaterialIcons name="emergency" size={20} color="#DC2626" />
                    </View>
                    <View style={styles.emergencyContent}>
                      <Text style={styles.emergencyTitle}>SOS Emergency</Text>
                      <Text style={styles.emergencySubtitle}>Immediate police dispatch</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#DC2626" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={() => Linking.openURL("tel:995")}
                  >
                    <View style={styles.emergencyIcon}>
                      <MaterialIcons name="call" size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.emergencyContent}>
                      <Text style={styles.emergencyTitle}>Call Emergency</Text>
                      <Text style={styles.emergencySubtitle}>Direct police line: 995</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingOverlayText}>Loading police stations...</Text>
          </View>
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
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: height * 0.6,
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sheetHeader: {
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  stationCardSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  stationCardInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stationIconSelected: {
    backgroundColor: "#3B82F6",
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 3,
  },
  markerSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
  },
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
    backgroundColor: "#3B82F6",
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
    backgroundColor: "#EF4444",
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
    maxHeight: height * 0.8,
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
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
  },
  loadingOverlayText: {
    marginTop: 16,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
};

export default PoliceMap;