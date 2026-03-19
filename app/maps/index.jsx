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
// Replace the value below with your actual Google Maps API key.
// Make sure the key has the "Directions API" enabled in Google Cloud Console.
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

/**
 * Decode a Google Maps encoded polyline string into an array of {latitude, longitude}.
 */
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

/** Strip HTML tags from a Google directions step instruction. */
const stripHtml = (html) => html?.replace(/<[^>]*>/g, "") ?? "";

// ── Component ─────────────────────────────────────────────────────────────────

const PoliceMap = () => {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const mapRef = useRef(null);

  // Animation values
  const sheetAnim = useRef(new Animated.Value(100)).current;
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
  const [routeCoords, setRouteCoords] = useState([]); // polyline points
  const [routeSteps, setRouteSteps] = useState([]); // turn-by-turn steps
  const [routeSummary, setRouteSummary] = useState(null); // { distance, duration }
  const [isNavigating, setIsNavigating] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  // ── Pan responders ────────────────────────────────────────────────────────

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetAnim.setValue(Math.min(g.dy, 400));
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

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchPoliceStations = async () => {
    try {
      setLoading(true);
      let records = [];

      if (isOnline) {
        try {
          records = await pb.collection("contacts").getFullList({});
          records = records
            .filter((s) =>
              isValidCoordinate(parseFloat(s.latitude), parseFloat(s.longitude))
            )
            .map((s) => {
              const lat = parseFloat(s.latitude);
              const lng = parseFloat(s.longitude);
              return {
                ...s,
                latitude: lat,
                longitude: lng,
                distance: userCoords
                  ? getDistanceFromLatLonInKm(
                      userCoords.latitude,
                      userCoords.longitude,
                      lat,
                      lng
                    )
                  : null,
              };
            });
        } catch (err) {
          console.log("Failed to fetch from PocketBase:", err);
        }
      }

      if (records.length === 0 && userCoords) records = generateDemoStations();

      setPoliceStations(records);
      setFilteredStations(records);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoStations = () => {
    if (!userCoords) return [];
    return [
      {
        id: "1",
        station: "Central Police HQ",
        latitude: userCoords.latitude + 0.01,
        longitude: userCoords.longitude + 0.005,
        station_number: "+263 24 274 593",
        address: "123 Central Ave, Harare CBD",
        description: "24/7 emergency services available",
        operating_hours: "24 Hours",
        services: "Emergency, Traffic, Investigations",
        distance: 1.2,
      },
      {
        id: "2",
        station: "Avondale Police Station",
        latitude: userCoords.latitude - 0.008,
        longitude: userCoords.longitude + 0.015,
        station_number: "+263 24 302 451",
        address: "45 Churchill Ave, Avondale",
        description: "Traffic division and community policing",
        operating_hours: "6 AM - 10 PM",
        services: "Traffic, Community Watch",
        distance: 1.8,
      },
      {
        id: "3",
        station: "Mbare Police Post",
        latitude: userCoords.latitude - 0.015,
        longitude: userCoords.longitude - 0.01,
        station_number: "+263 24 667 891",
        address: "Mbare Musika Complex",
        description: "Community policing center",
        operating_hours: "8 AM - 8 PM",
        services: "Community Policing",
        distance: 2.5,
      },
    ];
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
        toValue: 400,
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

  // ── Navigation (in-app) ───────────────────────────────────────────────────

  /**
   * Fetch a driving route from the Google Directions API, decode the polyline,
   * store the steps, and animate the map to fit the full route.
   */
  const handleNavigate = async (station) => {
    if (!isValidCoordinate(station.latitude, station.longitude)) {
      Alert.alert(
        "Navigation Error",
        "Cannot navigate — invalid station location."
      );
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
          `Could not fetch route: ${data.status}. Check your API key and that Directions API is enabled.`
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
          edgePadding: { top: 140, right: 40, bottom: 300, left: 40 },
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

  /** Cancel the active navigation session. */
  const cancelNavigation = () => {
    setIsNavigating(false);
    setRouteCoords([]);
    setRouteSteps([]);
    setRouteSummary(null);
    setActiveStepIndex(0);
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

  // ── Maneuver icon helper ──────────────────────────────────────────────────

  const maneuverIcon = (maneuver) => {
    const map = {
      "turn-left": "turn-left",
      "turn-right": "turn-right",
      "turn-sharp-left": "turn-left",
      "turn-sharp-right": "turn-right",
      "turn-slight-left": "turn-left",
      "turn-slight-right": "turn-right",
      "uturn-left": "u-turn-left",
      "uturn-right": "u-turn-right",
      roundabout: "rotate-right",
      straight: "straight",
      merge: "merge",
      ramp: "call-merge",
    };
    return map[maneuver] ?? "arrow-forward";
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const stationsWithValidCoords = filteredStations.filter((s) =>
    isValidCoordinate(s.latitude, s.longitude)
  );

  const renderStationCard = (station, index) => {
    const isSelected = selectedStation?.id === station.id;
    const distance = calculateStationDistance(station);

    return (
      <TouchableOpacity
        key={station.id || index}
        style={{
          backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
          borderRadius: 16,
          marginBottom: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: isSelected ? "#3b82f6" : "#e5e7eb",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => focusOnStation(station)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: isSelected ? "#3b82f6" : "#ef4444",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 12,
            }}
          >
            <Image
              source={require("../../assets/images/logo-alternate.png")}
              style={{ width: 44, height: 44, borderRadius: 8 }}
            />
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#1f2937" }}
                numberOfLines={1}
              >
                {station.station || "Police Station"}
              </Text>
              {distance !== null && (
                <Text
                  style={{ fontSize: 14, color: "#ef4444", fontWeight: "600" }}
                >
                  {distance.toFixed(1)} km
                </Text>
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <MaterialIcons name="location-on" size={14} color="#6b7280" />
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  marginLeft: 4,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {station.address || "Location data unavailable"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              {station.station_number && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialIcons name="phone" size={14} color="#6b7280" />
                  <Text
                    style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}
                  >
                    {station.station_number}
                  </Text>
                </View>
              )}
              {station.operating_hours && (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialIcons name="schedule" size={14} color="#6b7280" />
                  <Text
                    style={{ fontSize: 12, color: "#6b7280", marginLeft: 4 }}
                  >
                    {station.operating_hours}
                  </Text>
                </View>
              )}
            </View>

            {!isValidCoordinate(station.latitude, station.longitude) && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                  padding: 4,
                  backgroundColor: "#fef3c7",
                  borderRadius: 4,
                }}
              >
                <MaterialIcons name="warning" size={12} color="#92400e" />
                <Text
                  style={{
                    fontSize: 10,
                    color: "#92400e",
                    marginLeft: 4,
                    flex: 1,
                  }}
                >
                  Location data missing — cannot show on map
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ flex: 1 }}>
        {/* ── Map ── */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          toolbarEnabled={false}
        >
          {/* User marker */}
          {userCoords && (
            <Marker coordinate={userCoords} title="Your Location">
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#3b82f6",
                    borderWidth: 3,
                    borderColor: "#ffffff",
                    elevation: 5,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#ffffff",
                  }}
                />
              </View>
            </Marker>
          )}

          {/* Station markers */}
          {stationsWithValidCoords.map((station, index) => {
            const isSelected = selectedStation?.id === station.id;
            const distance = calculateStationDistance(station);
            return (
              <Marker
                key={station.id || index}
                coordinate={{
                  latitude: station.latitude,
                  longitude: station.longitude,
                }}
                onPress={() => focusOnStation(station)}
              >
                <View
                  style={{ alignItems: "center", justifyContent: "center" }}
                >
                  <View
                    style={{
                      width: isSelected ? 56 : 48,
                      height: isSelected ? 56 : 48,
                      borderRadius: isSelected ? 28 : 24,
                      backgroundColor: isSelected ? "#3b82f6" : "#ef4444",
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 3,
                      borderColor: "#ffffff",
                      elevation: 6,
                    }}
                  >
                    <FontAwesome5
                      name="shield-alt"
                      size={isSelected ? 20 : 18}
                      color="#fff"
                    />
                  </View>
                  {distance !== null && (
                    <View
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        backgroundColor: "#ffffff",
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        elevation: 3,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#ef4444",
                        }}
                      >
                        {distance.toFixed(1)}km
                      </Text>
                    </View>
                  )}
                </View>
              </Marker>
            );
          })}

          {/* ── Route polyline ── */}
          {isNavigating && routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#3b82f6"
              strokeWidth={5}
              lineDashPattern={[0]}
            />
          )}
        </MapView>

        {/* ── Overlays ── */}
        {isSheetOpen && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.3)",
              opacity: overlayAnim,
            }}
            pointerEvents="box-none"
          />
        )}
        {isDetailsOpen && (
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: detailsOverlayAnim,
            }}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={closeDetailsSheet}
              activeOpacity={1}
            />
          </Animated.View>
        )}

        {/* ── Top header ── */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: Platform.OS === "ios" ? 50 : 40,
            paddingHorizontal: 16,
            zIndex: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <TouchableOpacity
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#ffffff",
                justifyContent: "center",
                alignItems: "center",
                elevation: 4,
              }}
              onPress={() => {
                if (isNavigating) cancelNavigation();
                else router.back();
              }}
            >
              <Ionicons
                name={isNavigating ? "close" : "arrow-back"}
                size={24}
                color="#1f2937"
              />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: "#1f2937",
                  textAlign: "center",
                }}
              >
                {isNavigating ? "Navigating" : "Police Stations"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {isNavigating && routeSummary
                  ? `${routeSummary.distance} · ${routeSummary.duration}`
                  : `${stationsWithValidCoords.length} station${
                      stationsWithValidCoords.length !== 1 ? "s" : ""
                    } on map`}
              </Text>
            </View>

            <TouchableOpacity
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#ffffff",
                justifyContent: "center",
                alignItems: "center",
                elevation: 4,
              }}
              onPress={focusOnUser}
            >
              <MaterialCommunityIcons name="target" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>

          {/* Search bar — hidden while navigating */}
          {!isNavigating && (
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                elevation: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="search" size={20} color="#9ca3af" />
                <TextInput
                  style={{
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 16,
                    color: "#1f2937",
                  }}
                  placeholder="Search police stations..."
                  placeholderTextColor="#9ca3af"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialIcons name="close" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {!isOnline && <OfflineBanner />}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* ── Navigation Panel (step-by-step directions in bottom sheet) ──   */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {isNavigating && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              elevation: 20,
              paddingBottom: Platform.OS === "ios" ? 30 : 20,
              maxHeight: height * 0.55,
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingVertical: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "#d1d5db",
                  borderRadius: 2,
                }}
              />
            </View>

            {/* Current step highlight */}
            {routeSteps.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#eff6ff",
                  marginHorizontal: 16,
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: "#3b82f6",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialIcons
                    name={maneuverIcon(routeSteps[activeStepIndex]?.maneuver)}
                    size={24}
                    color="#fff"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#1e3a8a",
                    }}
                    numberOfLines={2}
                  >
                    {routeSteps[activeStepIndex]?.instruction}
                  </Text>
                  <Text
                    style={{ fontSize: 13, color: "#3b82f6", marginTop: 3 }}
                  >
                    {routeSteps[activeStepIndex]?.distance} ·{" "}
                    {routeSteps[activeStepIndex]?.duration}
                  </Text>
                </View>
                {/* Step navigation arrows */}
                <View style={{ flexDirection: "row", marginLeft: 8 }}>
                  <TouchableOpacity
                    disabled={activeStepIndex === 0}
                    onPress={() =>
                      setActiveStepIndex((i) => Math.max(i - 1, 0))
                    }
                    style={{ padding: 6 }}
                  >
                    <MaterialIcons
                      name="chevron-left"
                      size={26}
                      color={activeStepIndex === 0 ? "#d1d5db" : "#3b82f6"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={activeStepIndex === routeSteps.length - 1}
                    onPress={() =>
                      setActiveStepIndex((i) =>
                        Math.min(i + 1, routeSteps.length - 1)
                      )
                    }
                    style={{ padding: 6 }}
                  >
                    <MaterialIcons
                      name="chevron-right"
                      size={26}
                      color={
                        activeStepIndex === routeSteps.length - 1
                          ? "#d1d5db"
                          : "#3b82f6"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* All steps list */}
            <ScrollView
              style={{ paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {routeSteps.map((step, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setActiveStepIndex(i)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f3f4f6",
                    backgroundColor:
                      i === activeStepIndex ? "#f0f9ff" : "transparent",
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    marginBottom: 2,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor:
                        i === activeStepIndex ? "#3b82f6" : "#f3f4f6",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 12,
                    }}
                  >
                    <MaterialIcons
                      name={maneuverIcon(step.maneuver)}
                      size={18}
                      color={i === activeStepIndex ? "#fff" : "#6b7280"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#1f2937",
                        fontWeight: i === activeStepIndex ? "600" : "400",
                      }}
                      numberOfLines={2}
                    >
                      {step.instruction}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}
                    >
                      {step.distance} · {step.duration}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Destination reached row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#ef4444",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 12,
                  }}
                >
                  <FontAwesome5 name="shield-alt" size={14} color="#fff" />
                </View>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#ef4444" }}
                >
                  {selectedStation?.station ?? "Destination"}
                </Text>
              </View>
            </ScrollView>

            {/* Cancel navigation button */}
            <TouchableOpacity
              style={{
                marginHorizontal: 16,
                marginTop: 8,
                backgroundColor: "#fef2f2",
                borderRadius: 12,
                padding: 14,
                alignItems: "center",
              }}
              onPress={cancelNavigation}
            >
              <Text
                style={{ color: "#ef4444", fontWeight: "700", fontSize: 15 }}
              >
                Cancel Navigation
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Main station list bottom sheet (hidden while navigating) ── */}
        {!isNavigating && (
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 500,
              backgroundColor: "#f9fafb",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              elevation: 20,
              transform: [{ translateY: sheetAnim }],
            }}
            {...panResponder.panHandlers}
          >
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "#d1d5db",
                  borderRadius: 2,
                }}
              />
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <View>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "700",
                      color: "#1f2937",
                    }}
                  >
                    Police Stations
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}
                  >
                    {filteredStations.length} total ·{" "}
                    {stationsWithValidCoords.length} with location
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: "#3b82f6",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={isSheetOpen ? closeSheet : openSheet}
                >
                  <MaterialIcons
                    name={isSheetOpen ? "expand-more" : "expand-less"}
                    size={24}
                    color="#ffffff"
                  />
                </TouchableOpacity>
              </View>

              {filteredStations.length === 0 ? (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 40,
                  }}
                >
                  <MaterialIcons
                    name="location-off"
                    size={64}
                    color="#d1d5db"
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#9ca3af",
                      marginTop: 16,
                    }}
                  >
                    No police stations found
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#9ca3af",
                      textAlign: "center",
                      marginTop: 8,
                    }}
                  >
                    {searchQuery
                      ? "Try a different search term"
                      : "No stations available in database"}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ height: 380 }}
                >
                  {filteredStations.map((station, index) =>
                    renderStationCard(station, index)
                  )}
                </ScrollView>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Station detail bottom sheet ── */}
        {isDetailsOpen && selectedStation && (
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 600,
              backgroundColor: "#ffffff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              elevation: 24,
              transform: [{ translateY: detailsSheetAnim }],
            }}
            {...detailsPanResponder.panHandlers}
          >
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: "#d1d5db",
                  borderRadius: 2,
                }}
              />
            </View>

            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                {/* Header */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 24,
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 16,
                      backgroundColor: "#ef4444",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 16,
                    }}
                  >
                    <FontAwesome5 name="shield-alt" size={28} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "700",
                        color: "#1f2937",
                      }}
                      numberOfLines={2}
                    >
                      {selectedStation.station}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <MaterialIcons
                        name="location-on"
                        size={16}
                        color="#6b7280"
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          color: "#6b7280",
                          marginLeft: 4,
                          flex: 1,
                        }}
                        numberOfLines={2}
                      >
                        {selectedStation.address || "No address available"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Location warning */}
                {!isValidCoordinate(
                  selectedStation.latitude,
                  selectedStation.longitude
                ) && (
                  <View
                    style={{
                      backgroundColor: "#fef3c7",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 24,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <MaterialIcons name="warning" size={24} color="#92400e" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontWeight: "600", color: "#92400e" }}>
                        Location Data Missing
                      </Text>
                      <Text
                        style={{ fontSize: 12, color: "#92400e", marginTop: 2 }}
                      >
                        This station cannot be shown on the map. Contact
                        information is still available.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Quick actions */}
                <View style={{ flexDirection: "row", marginBottom: 24 }}>
                  {/* Navigate — now in-app */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isValidCoordinate(
                        selectedStation.latitude,
                        selectedStation.longitude
                      )
                        ? "#3b82f6"
                        : "#9ca3af",
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                      marginRight: 8,
                      opacity: navLoading ? 0.7 : 1,
                    }}
                    onPress={() => handleNavigate(selectedStation)}
                    disabled={
                      !isValidCoordinate(
                        selectedStation.latitude,
                        selectedStation.longitude
                      ) || navLoading
                    }
                  >
                    {navLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <MaterialCommunityIcons
                        name="navigation"
                        size={24}
                        color="#fff"
                      />
                    )}
                    <Text
                      style={{ color: "#fff", fontWeight: "600", marginTop: 8 }}
                    >
                      {!isValidCoordinate(
                        selectedStation.latitude,
                        selectedStation.longitude
                      )
                        ? "No Location"
                        : navLoading
                        ? "Loading…"
                        : "Navigate"}
                    </Text>
                  </TouchableOpacity>

                  {/* Call */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: selectedStation.station_number
                        ? "#10b981"
                        : "#9ca3af",
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                      marginHorizontal: 8,
                    }}
                    onPress={() =>
                      selectedStation.station_number &&
                      handleCall(selectedStation)
                    }
                    disabled={!selectedStation.station_number}
                  >
                    <MaterialIcons name="phone" size={24} color="#fff" />
                    <Text
                      style={{ color: "#fff", fontWeight: "600", marginTop: 8 }}
                    >
                      {selectedStation.station_number ? "Call" : "No Phone"}
                    </Text>
                  </TouchableOpacity>

                  {/* Report */}
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#8b5cf6",
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                      marginLeft: 8,
                    }}
                    onPress={() => router.push("/report/crime")}
                  >
                    <MaterialIcons name="report" size={24} color="#fff" />
                    <Text
                      style={{ color: "#fff", fontWeight: "600", marginTop: 8 }}
                    >
                      Report
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Details */}
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#1f2937",
                      marginBottom: 16,
                    }}
                  >
                    Station Details
                  </Text>
                  <View style={{ gap: 16 }}>
                    {selectedStation.station_number && (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: "#dbeafe",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}
                        >
                          <MaterialIcons
                            name="phone"
                            size={20}
                            color="#3b82f6"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            Phone Number
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              color: "#1f2937",
                              fontWeight: "500",
                            }}
                          >
                            {selectedStation.station_number}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            backgroundColor: "#dbeafe",
                            borderRadius: 8,
                          }}
                          onPress={() => handleCall(selectedStation)}
                        >
                          <Text style={{ color: "#3b82f6", fontWeight: "600" }}>
                            Call Now
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {isValidCoordinate(
                      selectedStation.latitude,
                      selectedStation.longitude
                    ) &&
                      userCoords && (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 8,
                              backgroundColor: "#fee2e2",
                              justifyContent: "center",
                              alignItems: "center",
                              marginRight: 12,
                            }}
                          >
                            <MaterialIcons
                              name="directions"
                              size={20}
                              color="#ef4444"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: "#6b7280" }}>
                              Distance
                            </Text>
                            <Text
                              style={{
                                fontSize: 16,
                                color: "#1f2937",
                                fontWeight: "500",
                              }}
                            >
                              {calculateStationDistance(
                                selectedStation
                              )?.toFixed(1) ?? "N/A"}{" "}
                              km away
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              backgroundColor: "#fee2e2",
                              borderRadius: 8,
                            }}
                            onPress={() => handleNavigate(selectedStation)}
                          >
                            <Text
                              style={{ color: "#ef4444", fontWeight: "600" }}
                            >
                              Directions
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                    {selectedStation.operating_hours && (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: "#d1fae5",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}
                        >
                          <MaterialIcons
                            name="schedule"
                            size={20}
                            color="#10b981"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            Operating Hours
                          </Text>
                          <Text
                            style={{
                              fontSize: 16,
                              color: "#1f2937",
                              fontWeight: "500",
                            }}
                          >
                            {selectedStation.operating_hours}
                          </Text>
                        </View>
                      </View>
                    )}

                    {selectedStation.description && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                        }}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: "#f3e8ff",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 12,
                          }}
                        >
                          <MaterialIcons
                            name="info"
                            size={20}
                            color="#8b5cf6"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: "#6b7280" }}>
                            Description
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: "#1f2937",
                              lineHeight: 20,
                            }}
                          >
                            {selectedStation.description}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Emergency actions */}
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#1f2937",
                      marginBottom: 16,
                    }}
                  >
                    Emergency Actions
                  </Text>
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#fef2f2",
                        padding: 16,
                        borderRadius: 12,
                      }}
                      onPress={() => router.push("/emergency")}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: "#ef4444",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <MaterialIcons
                          name="emergency"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "600", color: "#dc2626" }}>
                          SOS Emergency
                        </Text>
                        <Text style={{ fontSize: 12, color: "#dc2626" }}>
                          Immediate police dispatch
                        </Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color="#dc2626"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#eff6ff",
                        padding: 16,
                        borderRadius: 12,
                      }}
                      onPress={() => Linking.openURL("tel:995")}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: "#3b82f6",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}
                      >
                        <MaterialIcons name="call" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "600", color: "#2563eb" }}>
                          Call Emergency
                        </Text>
                        <Text style={{ fontSize: 12, color: "#2563eb" }}>
                          Direct police line: 995
                        </Text>
                      </View>
                      <MaterialIcons
                        name="chevron-right"
                        size={24}
                        color="#2563eb"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Map controls ── */}
        {!isNavigating && (
          <View
            style={{ position: "absolute", bottom: 520, right: 16, zIndex: 20 }}
          >
            <TouchableOpacity
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#ffffff",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12,
                elevation: 8,
              }}
              onPress={focusOnUser}
            >
              <MaterialCommunityIcons name="target" size={24} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#ffffff",
                justifyContent: "center",
                alignItems: "center",
                elevation: 8,
              }}
              onPress={isSheetOpen ? closeSheet : openSheet}
            >
              <MaterialIcons name="list" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Loading overlay ── */}
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255,255,255,0.9)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 30,
            }}
          >
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text
              style={{
                marginTop: 16,
                fontSize: 16,
                color: "#6b7280",
                fontWeight: "500",
              }}
            >
              Loading police stations…
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PoliceMap;
