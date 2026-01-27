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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import pb from "../../lib/connection";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineBanner from "../components/OfflineBanner";
import { 
  FontAwesome5, 
  Ionicons, 
  MaterialIcons, 
  MaterialCommunityIcons,
  Feather 
} from "@expo/vector-icons";
import { Image } from "react-native";

const { width, height } = Dimensions.get("window");

// Utility to calculate distance
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

// Function to validate coordinates
const isValidCoordinate = (lat, lng) => {
  return lat !== null && lat !== undefined && 
         lng !== null && lng !== undefined &&
         !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) &&
         parseFloat(lat) !== 0 && parseFloat(lng) !== 0;
};

const PoliceMap = () => {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  
  const mapRef = useRef(null);
  
  // Animation values for bottom sheets
  const sheetAnim = useRef(new Animated.Value(100)).current;
  const detailsSheetAnim = useRef(new Animated.Value(height)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const detailsOverlayAnim = useRef(new Animated.Value(0)).current;
  
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

  // Pan responders for bottom sheets
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetAnim.setValue(Math.min(gestureState.dy, 400));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeSheet();
        } else {
          openSheet();
        }
      },
    })
  ).current;

  const detailsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          detailsSheetAnim.setValue(Math.max(height - 600 + gestureState.dy, 0));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeDetailsSheet();
        } else {
          openDetailsSheet();
        }
      },
    })
  ).current;

  const fetchPoliceStations = async () => {
    try {
      setLoading(true);
      let records = [];
      
      if (isOnline) {
        try {
          records = await pb.collection("contacts").getFullList({});
          
          // Filter and process stations with valid coordinates
          records = records
            .filter(station => {
              const lat = parseFloat(station.latitude);
              const lng = parseFloat(station.longitude);
              return isValidCoordinate(lat, lng);
            })
            .map(station => {
              const lat = parseFloat(station.latitude);
              const lng = parseFloat(station.longitude);
              
              return {
                ...station,
                latitude: lat,
                longitude: lng,
                // Calculate distance if user location is available
                distance: userCoords 
                  ? getDistanceFromLatLonInKm(
                      userCoords.latitude,
                      userCoords.longitude,
                      lat,
                      lng
                    )
                  : null
              };
            });
            
        } catch (err) {
          console.log("Failed to fetch from PocketBase:", err);
        }
      }
      
      // If no valid stations found, show demo stations near user
      if (records.length === 0 && userCoords) {
        records = generateDemoStations();
      }
      
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
        distance: 1.2
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
        distance: 1.8
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
        distance: 2.5
      }
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
            { text: "Settings", onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
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
    ]).start(() => {
      setIsSheetOpen(false);
    });
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

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (userCoords) {
      fetchPoliceStations();
    }
  }, [userCoords, isOnline]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStations(policeStations);
    } else {
      const filtered = policeStations.filter(station =>
        station.station?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStations(filtered);
    }
  }, [searchQuery, policeStations]);

  // Function to calculate distance for a station
  const calculateStationDistance = (station) => {
    if (!userCoords || !isValidCoordinate(station.latitude, station.longitude)) {
      return null;
    }
    return getDistanceFromLatLonInKm(
      userCoords.latitude,
      userCoords.longitude,
      station.latitude,
      station.longitude
    );
  };

  const focusOnStation = (station) => {
    if (!isValidCoordinate(station.latitude, station.longitude)) {
      Alert.alert("Location Error", "This station has invalid location data.");
      return;
    }
    
    setSelectedStation(station);
    
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
    
    // Open details sheet
    openDetailsSheet();
  };

  const focusOnUser = () => {
    if (userCoords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 500);
    }
  };

  const handleNavigate = (station) => {
    if (!isValidCoordinate(station.latitude, station.longitude)) {
      Alert.alert("Navigation Error", "Cannot navigate to this station due to invalid location.");
      return;
    }
    
    const url = Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${station.latitude},${station.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}&travelmode=driving`;
    
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open navigation app");
    });
  };

  const handleCall = (station) => {
    const phoneNumber = station.station_number?.replace(/[^\d+]/g, '');
    if (phoneNumber) {
      const url = `tel:${phoneNumber}`;
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not make the call");
      });
    } else {
      Alert.alert("Error", "Phone number not available");
    }
  };

  const renderStationCard = (station, index) => {
    const isSelected = selectedStation?.id === station.id;
    const distance = calculateStationDistance(station);
    
    return (
      <TouchableOpacity
        key={station.id || index}
        style={{
          backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
          borderRadius: 16,
          marginBottom: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: isSelected ? '#3b82f6' : '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
        onPress={() => focusOnStation(station)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: isSelected ? '#3b82f6' : '#ef4444',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
    <Image
                      source={require("../../assets/images/logo-alternate.png")}
                      style= {{
    width: 44,
    height: 44,
    borderRadius: 8,
  }}
                    />          </View>
          
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937' }} numberOfLines={1}>
                {station.station || "Police Station"}
              </Text>
              {distance !== null && (
                <Text style={{ fontSize: 14, color: '#ef4444', fontWeight: '600' }}>
                  {distance.toFixed(1)} km
                </Text>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <MaterialIcons name="location-on" size={14} color="#6b7280" />
              <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 4, flex: 1 }} numberOfLines={1}>
                {station.address || "Location data unavailable"}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              {station.station_number && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                  <MaterialIcons name="phone" size={14} color="#6b7280" />
                  <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                    {station.station_number}
                  </Text>
                </View>
              )}
              
              {station.operating_hours && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="schedule" size={14} color="#6b7280" />
                  <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                    {station.operating_hours}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Show warning if no location data */}
            {!isValidCoordinate(station.latitude, station.longitude) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, padding: 4, backgroundColor: '#fef3c7', borderRadius: 4 }}>
                <MaterialIcons name="warning" size={12} color="#92400e" />
                <Text style={{ fontSize: 10, color: '#92400e', marginLeft: 4, flex: 1 }}>
                  Location data missing - cannot show on map
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Get stations with valid coordinates for the map
  const stationsWithValidCoords = filteredStations.filter(station => 
    isValidCoordinate(station.latitude, station.longitude)
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={{ flex: 1 }}>
        {/* Map View */}
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          toolbarEnabled={false}
        >
          {/* User Location Marker */}
          {userCoords && (
            <Marker coordinate={userCoords} title="Your Location">
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#3b82f6',
                  borderWidth: 3,
                  borderColor: '#ffffff',
                  elevation: 5,
                }} />
                <View style={{
                  position: 'absolute',
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#ffffff',
                }} />
              </View>
            </Marker>
          )}

          {/* Police Station Markers - Only show stations with valid coordinates */}
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
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{
                    width: isSelected ? 56 : 48,
                    height: isSelected ? 56 : 48,
                    borderRadius: isSelected ? 28 : 24,
                    backgroundColor: isSelected ? '#3b82f6' : '#ef4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: '#ffffff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 6,
                  }}>
                    <FontAwesome5 name="shield-alt" size={isSelected ? 20 : 18} color="#fff" />
                  </View>
                  {distance !== null && (
                    <View style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 3,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#ef4444' }}>
                        {distance.toFixed(1)}km
                      </Text>
                    </View>
                  )}
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Overlay for main sheet */}
        {isSheetOpen && (
          <Animated.View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              opacity: overlayAnim,
            }}
            pointerEvents="box-none"
          />
        )}

        {/* Overlay for details sheet */}
        {isDetailsOpen && (
          <Animated.View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
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

        {/* Top Header */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: Platform.OS === 'ios' ? 50 : 40,
          paddingHorizontal: 16,
          zIndex: 10,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            <TouchableOpacity 
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
              }}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#1f2937', textAlign: 'center' }}>
                Police Stations
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 2 }}>
                {stationsWithValidCoords.length} station{stationsWithValidCoords.length !== 1 ? 's' : ''} on map
              </Text>
            </View>
            
            <TouchableOpacity 
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 4,
              }}
              onPress={focusOnUser}
            >
              <MaterialCommunityIcons name="target" size={24} color="#1f2937" />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="search" size={20} color="#9ca3af" />
              <TextInput
                style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#1f2937' }}
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
        </View>

        {!isOnline && <OfflineBanner />}

        {/* Main Bottom Sheet */}
        <Animated.View 
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 500,
            backgroundColor: '#f9fafb',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 20,
            transform: [{ translateY: sheetAnim }],
          }}
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{
              width: 40,
              height: 4,
              backgroundColor: '#d1d5db',
              borderRadius: 2,
            }} />
          </View>
          
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#1f2937' }}>
                  Police Stations
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
                  {filteredStations.length} total • {stationsWithValidCoords.length} with location
                </Text>
              </View>
              
              <TouchableOpacity 
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#3b82f6',
                  justifyContent: 'center',
                  alignItems: 'center',
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
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                <MaterialIcons name="location-off" size={64} color="#d1d5db" />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#9ca3af', marginTop: 16 }}>
                  No police stations found
                </Text>
                <Text style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>
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
                {filteredStations.map((station, index) => renderStationCard(station, index))}
              </ScrollView>
            )}
          </View>
        </Animated.View>

        {/* Details Bottom Sheet */}
        {isDetailsOpen && selectedStation && (
          <Animated.View 
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 600,
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 24,
              transform: [{ translateY: detailsSheetAnim }],
            }}
            {...detailsPanResponder.panHandlers}
          >
            {/* Drag Handle */}
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: '#d1d5db',
                borderRadius: 2,
              }} />
            </View>
            
            <ScrollView 
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                  <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 16,
                    backgroundColor: '#ef4444',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <FontAwesome5 name="shield-alt" size={28} color="#fff" />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#1f2937' }} numberOfLines={2}>
                      {selectedStation.station}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <MaterialIcons name="location-on" size={16} color="#6b7280" />
                      <Text style={{ fontSize: 14, color: '#6b7280', marginLeft: 4, flex: 1 }} numberOfLines={2}>
                        {selectedStation.address || "No address available"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Location Warning if invalid */}
                {!isValidCoordinate(selectedStation.latitude, selectedStation.longitude) && (
                  <View style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 24,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <MaterialIcons name="warning" size={24} color="#92400e" />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: '#92400e' }}>
                        Location Data Missing
                      </Text>
                      <Text style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                        This station cannot be shown on the map. Contact information is still available.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Quick Actions */}
                <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      backgroundColor: isValidCoordinate(selectedStation.latitude, selectedStation.longitude) ? '#3b82f6' : '#9ca3af',
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                      marginRight: 8,
                    }}
                    onPress={() => isValidCoordinate(selectedStation.latitude, selectedStation.longitude) && handleNavigate(selectedStation)}
                    disabled={!isValidCoordinate(selectedStation.latitude, selectedStation.longitude)}
                  >
                    <MaterialCommunityIcons name="navigation" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', marginTop: 8 }}>
                      {isValidCoordinate(selectedStation.latitude, selectedStation.longitude) ? 'Navigate' : 'No Location'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      backgroundColor: selectedStation.station_number ? '#10b981' : '#9ca3af',
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                      marginHorizontal: 8,
                    }}
                    onPress={() => selectedStation.station_number && handleCall(selectedStation)}
                    disabled={!selectedStation.station_number}
                  >
                    <MaterialIcons name="phone" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', marginTop: 8 }}>
                      {selectedStation.station_number ? 'Call' : 'No Phone'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{
                      flex: 1,
                      backgroundColor: '#8b5cf6',
                      borderRadius: 12,
                      padding: 16,
                      alignItems: 'center',
                      marginLeft: 8,
                    }}
                    onPress={() => router.push('/report/crime')}
                  >
                    <MaterialIcons name="report" size={24} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '600', marginTop: 8 }}>Report</Text>
                  </TouchableOpacity>
                </View>

                {/* Details */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
                    Station Details
                  </Text>
                  
                  <View style={{ gap: 16 }}>
                    {selectedStation.station_number && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: '#dbeafe',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                          <MaterialIcons name="phone" size={20} color="#3b82f6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>Phone Number</Text>
                          <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                            {selectedStation.station_number}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            backgroundColor: '#dbeafe',
                            borderRadius: 8,
                          }}
                          onPress={() => handleCall(selectedStation)}
                        >
                          <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Call Now</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {isValidCoordinate(selectedStation.latitude, selectedStation.longitude) && userCoords && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: '#fee2e2',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                          <MaterialIcons name="directions" size={20} color="#ef4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>Distance</Text>
                          <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                            {calculateStationDistance(selectedStation)?.toFixed(1) || 'N/A'} km away
                          </Text>
                        </View>
                        {isValidCoordinate(selectedStation.latitude, selectedStation.longitude) && (
                          <TouchableOpacity 
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                              backgroundColor: '#fee2e2',
                              borderRadius: 8,
                            }}
                            onPress={() => handleNavigate(selectedStation)}
                          >
                            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Get Directions</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    
                    {selectedStation.operating_hours && (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: '#d1fae5',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                          <MaterialIcons name="schedule" size={20} color="#10b981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>Operating Hours</Text>
                          <Text style={{ fontSize: 16, color: '#1f2937', fontWeight: '500' }}>
                            {selectedStation.operating_hours}
                          </Text>
                        </View>
                      </View>
                    )}
                    
                    {selectedStation.description && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: '#f3e8ff',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12,
                        }}>
                          <MaterialIcons name="info" size={20} color="#8b5cf6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>Description</Text>
                          <Text style={{ fontSize: 14, color: '#1f2937', lineHeight: 20 }}>
                            {selectedStation.description}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                {/* Emergency Actions */}
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 16 }}>
                    Emergency Actions
                  </Text>
                  <View style={{ gap: 12 }}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 16, borderRadius: 12 }}
                      onPress={() => router.push('/emergency')}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: '#ef4444',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <MaterialIcons name="emergency" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: '#dc2626' }}>SOS Emergency</Text>
                        <Text style={{ fontSize: 12, color: '#dc2626' }}>Immediate police dispatch</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color="#dc2626" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 16, borderRadius: 12 }}
                      onPress={() => Linking.openURL('tel:995')}
                    >
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: '#3b82f6',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <MaterialIcons name="call" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600', color: '#2563eb' }}>Call Emergency</Text>
                        <Text style={{ fontSize: 12, color: '#2563eb' }}>Direct police line: 995</Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color="#2563eb" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Map Controls */}
        <View style={{
          position: 'absolute',
          bottom: 520,
          right: 16,
          zIndex: 20,
        }}>
          <TouchableOpacity 
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
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
              backgroundColor: '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 8,
            }}
            onPress={isSheetOpen ? closeSheet : openSheet}
          >
            <MaterialIcons name="list" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Loading Overlay */}
        {loading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 30,
          }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#6b7280', fontWeight: '500' }}>
              Loading police stations...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PoliceMap;