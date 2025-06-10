import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { router, Stack } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import pb from "../../lib/connection";
import * as Location from "expo-location";

const PoliceMap = () => {
  const [policeStations, setPoliceStations] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapRegion, setMapRegion] = useState({
    latitude: -17.8252,
    longitude: 31.0335,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const fetchPoliceStations = async () => {
    try {
      setLoading(true);
      const records = await pb.collection("contacts").getFullList({});

      setPoliceStations(records);
    } catch (err) {
      console.error("Failed to fetch police stations:", err);
      setPoliceStations([
        {
          id: "1",
          name: "Central Police Station",
          latitude: -17.8292,
          longitude: 31.0522,
          address: "Central Avenue, Harare",
          phone: "+263-4-703631",
        },
        {
          id: "2",
          name: "Highlands Police Station",
          latitude: -17.7852,
          longitude: 31.0735,
          address: "Highlands, Harare",
          phone: "+263-4-776688",
        },
        {
          id: "3",
          name: "Mbare Police Station",
          latitude: -17.8652,
          longitude: 31.0235,
          address: "Mbare, Harare",
          phone: "+263-4-664433",
        },
        {
          id: "4",
          name: "Avondale Police Station",
          latitude: -17.8052,
          longitude: 31.0435,
          address: "Avondale, Harare",
          phone: "+263-4-302211",
        },
        {
          id: "5",
          name: "Borrowdale Police Station",
          latitude: -17.7652,
          longitude: 31.0935,
          address: "Borrowdale, Harare",
          phone: "+263-4-885522",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission helps us show nearby police stations."
        );
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      setUserCoords({ latitude, longitude });

      // Update map region to center on user location
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Unable to get your current location");
    }
  };

  useEffect(() => {
    // getLocation();
    fetchPoliceStations();
  }, []);

  const onStationPress = (station) => {
    Alert.alert(
      "Station Details",
      `Station: ${station.station || "Police Station"}\nOfficer In Charge: ${
        station.member_in_charge || "Not Available"
      } \nDistrict: ${station.district || "District"}\n+${
        station.station_number || "No phone available"
      }`,
      [
        { text: "Cancel", style: "cancel" },
        ...(station.station_number
          ? [
              {
                text: "Call",
                onPress: () => {
                  const url = `tel:${station.station_number}`;
                  Linking.openURL(url).catch(() =>
                    Alert.alert("Error", "Could not make the call")
                  );
                },
              },
            ]
          : []),
        {
          text: "Get Directions",
          onPress: () => {
            const url = `https://maps.google.com/?q=${station.latitude},${station.longitude}`;
            Linking.openURL(url);
          },
        },
      ]
    );
  };

  const centerOnUser = () => {
    if (userCoords) {
      setMapRegion({
        ...userCoords,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } else {
      getLocation();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Stack.Screen
        options={{
          title: "Police Stations Map",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#2563eb" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={centerOnUser}
              style={styles.locationButton}
            >
              <Ionicons name="location" size={24} color="#2563eb" />
            </TouchableOpacity>
          ),
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading police stations...</Text>
        </View>
      )}

      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
        onRegionChangeComplete={setMapRegion}
      >
        {userCoords && (
          <Marker
            coordinate={userCoords}
            title="Your Location"
            description="You are here"
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </Marker>
        )}

        {policeStations.map(
          (station) =>
            station.latitude &&
            station.longitude && (
              <Marker
                key={station.id}
                coordinate={{
                  latitude: parseFloat(station.latitude),
                  longitude: parseFloat(station.longitude),
                }}
                title={station.station}
                description={station.address || "Police Station"}
                onPress={() => onStationPress(station)}
              >
                <View style={styles.customMarker}>
                  <FontAwesome5 name="shield-alt" size={20} color="#ffffff" />
                </View>
              </Marker>
            )
        )}
      </MapView>

      {/* Bottom Info Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.infoRow}>
          <View style={styles.legendItem}>
            <View style={styles.userMarkerLegend}>
              <View style={styles.userMarkerInner} />
            </View>
            <Text style={styles.legendText}>Your Location</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.customMarkerLegend}>
              <FontAwesome5 name="shield-alt" size={16} color="#ffffff" />
            </View>
            <Text style={styles.legendText}>Police Station</Text>
          </View>
        </View>
        <Text style={styles.instructionText}>
          Tap on any police station marker for more options
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    flex: 1,
  },
  backButton: {
    marginLeft: 16,
    padding: 8,
  },
  locationButton: {
    marginRight: 16,
    padding: 8,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
  },
  customMarker: {
    backgroundColor: "#2563eb",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  userMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3b82f6",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  bottomPanel: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  customMarkerLegend: {
    backgroundColor: "#2563eb",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    marginRight: 8,
  },
  userMarkerLegend: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    borderWidth: 2,
    borderColor: "#ffffff",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  legendText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  instructionText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default PoliceMap;
