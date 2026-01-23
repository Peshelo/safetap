import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import pb from "../../lib/connection";
import CustomHeader from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import OfflineBanner from "../components/OfflineBanner";
import useNetworkStatus from "../hooks/useNetworkStatus";
import { FontAwesome5 } from "@expo/vector-icons";

// Utility to calculate distance between coords
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
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

const PoliceMap = () => {
  const navigation = useNavigation();
  const isOnline = useNetworkStatus();

  const [userCoords, setUserCoords] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: -17.8252,
    longitude: 31.0335,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [policeStations, setPoliceStations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPoliceStations = async () => {
    try {
      setLoading(true);
      let records = [];
      try {
        records = await pb.collection("contacts").getFullList({});
      } catch (err) {
        console.log("Failed to fetch online, loading default stations", err);
        // fallback sample stations
        records = [
          {
            id: "1",
            station: "Central Police Station",
            latitude: -17.8292,
            longitude: 31.0522,
            station_number: "+2634703631",
            address: "Central Avenue, Harare",
          },
          {
            id: "2",
            station: "Highlands Police Station",
            latitude: -17.7852,
            longitude: 31.0735,
            station_number: "+2634776688",
            address: "Highlands, Harare",
          },
          {
            id: "3",
            station: "Mbare Police Station",
            latitude: -17.8652,
            longitude: 31.0235,
            station_number: "+2634664433",
            address: "Mbare, Harare",
          },
        ];
      }
      setPoliceStations(records);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is needed to show nearby police stations."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
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
      Alert.alert("Error", "Unable to get your location.");
    }
  };

  useEffect(() => {
    fetchPoliceStations();
    getLocation();
  }, []);

  // Sort police stations by distance
  const sortedStations = userCoords
    ? [...policeStations].sort((a, b) => {
        const dA = getDistanceFromLatLonInKm(
          userCoords.latitude,
          userCoords.longitude,
          parseFloat(a.latitude),
          parseFloat(a.longitude)
        );
        const dB = getDistanceFromLatLonInKm(
          userCoords.latitude,
          userCoords.longitude,
          parseFloat(b.latitude),
          parseFloat(b.longitude)
        );
        return dA - dB;
      })
    : policeStations;

  const onStationPress = (station) => {
    const distance = userCoords
      ? getDistanceFromLatLonInKm(
          userCoords.latitude,
          userCoords.longitude,
          parseFloat(station.latitude),
          parseFloat(station.longitude)
        ).toFixed(1)
      : null;

    Alert.alert(
      station.station || "Police Station",
      `${station.address || ""}\n${
        station.station_number ? `Phone: ${station.station_number}` : ""
      }${distance ? `\nDistance: ${distance} km` : ""}`,
      [
        { text: "Cancel", style: "cancel" },
        ...(station.station_number
          ? [
              {
                text: "Call",
                onPress: () => {
                  const url = `tel:${station.station_number}`;
                  Linking.openURL(url).catch(() =>
                    Alert.alert("Error", "Cannot make the call")
                  );
                },
              },
            ]
          : []),
        {
          text: "Directions",
          onPress: () => {
            const url =
              Platform.OS === "ios"
                ? `http://maps.apple.com/?daddr=${station.latitude},${station.longitude}`
                : `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CustomHeader
        title="Police Stations"
        subtitle="Nearby police stations"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
      />

      {!isOnline && <OfflineBanner />}

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading stations...</Text>
        </View>
      )}

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        zoomControlEnabled={false}
      >
        {userCoords && (
          <Marker coordinate={userCoords} title="You are here">
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}

        {sortedStations.map(
          (station) =>
            station.latitude &&
            station.longitude && (
              <Marker
                key={station.id}
                coordinate={{
                  latitude: parseFloat(station.latitude),
                  longitude: parseFloat(station.longitude),
                }}
                onPress={() => onStationPress(station)}
              >
                <View style={styles.stationMarker}>
                  <FontAwesome5 name="shield-alt" size={20} color="#fff" />
                </View>
              </Marker>
            )
        )}
      </MapView>

      <View style={styles.bottomPanel}>
        <Text style={styles.instructionText}>
          Tap a police station for details & directions
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#6b7280" },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    borderWidth: 3,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  userMarkerInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  stationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 5,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  instructionText: {
    textAlign: "center",
    color: "#374151",
    fontWeight: "500",
  },
});

export default PoliceMap;
