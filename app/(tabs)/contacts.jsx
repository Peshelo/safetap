// import React, { useState, useEffect } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ScrollView,
//   TextInput,
//   ActivityIndicator,
//   FlatList,
//   Image,
//   StatusBar,
//   StyleSheet,
//   Dimensions,
// } from "react-native";
// import { Picker } from "@react-native-picker/picker";
// import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
// import pb from "../../lib/connection";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { Stack, useRouter } from "expo-router";
// import * as Network from "expo-network";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as SecureStore from "expo-secure-store";

// const { width } = Dimensions.get("window");

// // Zimbabwe provinces and districts
// const zimbabweProvinces = {
//   Bulawayo: ["Bulawayo"],
//   Harare: ["Harare"],
//   Manicaland: [
//     "Buhera",
//     "Chimanimani",
//     "Chipinge",
//     "Makoni",
//     "Mutare",
//     "Mutasa",
//     "Nyanga",
//   ],
//   "Mashonaland Central": [
//     "Bindura",
//     "Guruve",
//     "Mazowe",
//     "Mbire",
//     "Mount Darwin",
//     "Muzarabani",
//     "Rushinga",
//     "Shamva",
//   ],
//   "Mashonaland East": [
//     "Chikomba",
//     "Goromonzi",
//     "Marondera",
//     "Mudzi",
//     "Murehwa",
//     "Mutoko",
//     "Seke",
//     "UMP",
//     "Wedza",
//   ],
//   "Mashonaland West": [
//     "Chegutu",
//     "Hurungwe",
//     "Kariba",
//     "Makonde",
//     "Mhondoro-Ngezi",
//     "Zvimba",
//     "Sanyati",
//     "Kadoma",
//   ],
//   Masvingo: [
//     "Bikita",
//     "Chiredzi",
//     "Chivi",
//     "Gutu",
//     "Masvingo",
//     "Mwenezi",
//     "Zaka",
//   ],
//   "Matabeleland North": [
//     "Binga",
//     "Bubi",
//     "Hwange",
//     "Lupane",
//     "Nkayi",
//     "Tsholotsho",
//     "Umguza",
//   ],
//   "Matabeleland South": [
//     "Beitbridge",
//     "Bulilima",
//     "Gwanda",
//     "Insiza",
//     "Mangwe",
//     "Matobo",
//     "Umzingwane",
//   ],
//   Midlands: [
//     "Chirumhanzu",
//     "Gokwe North",
//     "Gokwe South",
//     "Gweru",
//     "Kwekwe",
//     "Mberengwa",
//     "Shurugwi",
//     "Zvishavane",
//   ],
// };

// const EmergencyContacts = () => {
//   const [contacts, setContacts] = useState([]);
//   const [filteredContacts, setFilteredContacts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [syncing, setSyncing] = useState(false);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedProvince, setSelectedProvince] = useState("");
//   const [selectedDistrict, setSelectedDistrict] = useState("");
//   const [districts, setDistricts] = useState([]);
//   const [isOffline, setIsOffline] = useState(false);
//   const router = useRouter();

//   // Load contacts from cache or API
//   useEffect(() => {
//     const loadData = async () => {
//       try {
//         // Check network status
//         const networkState = await Network.getNetworkStateAsync();
//         setIsOffline(!networkState.isConnected);

//         // Try to load from cache first
//         // const cachedContacts = await SecureStore.getItemAsync('emergencyContacts');
//         const cachedContacts = await AsyncStorage.getItem("emergencyContacts");
//         if (cachedContacts) {
//           setContacts(JSON.parse(cachedContacts));
//           setFilteredContacts(JSON.parse(cachedContacts));
//         }

//         // Fetch fresh data if online
//         if (networkState.isConnected) {
//           await fetchContacts();
//         } else if (!cachedContacts) {
//           Alert.alert(
//             "Offline",
//             "No cached data available. Please connect to the internet to load contacts."
//           );
//         }
//       } catch (error) {
//         console.error("Error loading data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadData();
//   }, []);

//   const fetchContacts = async () => {
//     setSyncing(true);
//     try {
//       const records = await pb.collection("contacts").getFullList();
//       setContacts(records);
//       setFilteredContacts(records);
//       await SecureStore.setItemAsync(
//         "emergencyContacts",
//         JSON.stringify(records)
//       );
//       // await AsyncStorage.setItem('emergencyContacts', JSON.stringify(records));
//     } catch (error) {
//       console.error("Failed to fetch contacts:", error);
//       Alert.alert("Error", "Failed to sync contacts. Please try again.");
//     } finally {
//       setSyncing(false);
//     }
//   };

//   // Update districts when province changes
//   useEffect(() => {
//     if (selectedProvince) {
//       setDistricts(zimbabweProvinces[selectedProvince] || []);
//       setSelectedDistrict("");
//     } else {
//       setDistricts([]);
//       setSelectedDistrict("");
//     }
//   }, [selectedProvince]);

//   // Apply filters when any filter changes
//   useEffect(() => {
//     let results = contacts;

//     if (searchTerm) {
//       const term = searchTerm.toLowerCase();
//       results = results.filter(
//         (contact) =>
//           contact.station.toLowerCase().includes(term) ||
//           (contact.member_in_charge &&
//             contact.member_in_charge.toLowerCase().includes(term)) ||
//           (contact.specialty && contact.specialty.toLowerCase().includes(term))
//       );
//     }

//     if (selectedProvince) {
//       results = results.filter(
//         (contact) => contact.province === selectedProvince
//       );
//     }

//     if (selectedDistrict) {
//       results = results.filter(
//         (contact) => contact.district === selectedDistrict
//       );
//     }

//     setFilteredContacts(results);
//   }, [searchTerm, selectedProvince, selectedDistrict, contacts]);

//   const handleContactPress = (contact) => {
//     router.push({
//       pathname: "/contactDetails",
//       params: {
//         id: contact.id,
//         station: contact.station,
//         province: contact.province,
//         district: contact.district,
//         station_number: contact.station_number,
//         whatsapp_number: contact.whatsapp_number,
//         member_in_charge: contact.member_in_charge,
//         member_in_charge_number: contact.member_in_charge_number,
//         specialty: contact.specialty,
//       },
//     });
//   };

//   const renderContactItem = ({ item }) => (
//     <TouchableOpacity
//       style={styles.contactCard}
//       onPress={() => handleContactPress(item)}
//       activeOpacity={0.8}
//     >
//       <View style={styles.contactIcon}>
//         <FontAwesome5 name="building" size={16} color="#4a6da7" />
//       </View>
//       <View style={styles.contactInfo}>
//         <Text style={styles.stationName}>{item.station}</Text>
//         <Text style={styles.locationText}>
//           {item.province} • {item.district}
//         </Text>
//       </View>
//       <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
//     </TouchableOpacity>
//   );

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <StatusBar barStyle={"dark-content"} backgroundColor={"#fff"} />

//       <Stack.Screen
//         options={{
//           title: "Stations",
//           headerShown: true,
//           headerRight: () => (
//             <TouchableOpacity onPress={fetchContacts} disabled={syncing}>
//               <MaterialIcons
//                 name="sync"
//                 size={24}
//                 color={syncing ? "#cbd5e0" : "#4a6da7"}
//                 style={{ marginRight: 15 }}
//               />
//             </TouchableOpacity>
//           ),
//         }}
//       />

//       <ScrollView
//         style={styles.container}
//         contentContainerStyle={styles.contentContainer}
//         keyboardShouldPersistTaps="handled"
//       >
//         {/* Search and Filters */}
//         <View style={styles.filterContainer}>
//           <TextInput
//             style={styles.searchInput}
//             placeholder="Search stations..."
//             placeholderTextColor="#a0aec0"
//             value={searchTerm}
//             onChangeText={setSearchTerm}
//           />

//           <View style={styles.pickerRow}>
//             <View style={[styles.pickerContainer, { marginRight: 10 }]}>
//               <Picker
//                 selectedValue={selectedProvince}
//                 onValueChange={setSelectedProvince}
//                 style={styles.picker}
//                 dropdownIconColor="#718096"
//               >
//                 <Picker.Item label="All Provinces" value="" />
//                 {Object.keys(zimbabweProvinces).map((province) => (
//                   <Picker.Item
//                     key={province}
//                     label={province}
//                     value={province}
//                   />
//                 ))}
//               </Picker>
//             </View>

//             {selectedProvince && (
//               <View style={styles.pickerContainer}>
//                 <Picker
//                   selectedValue={selectedDistrict}
//                   onValueChange={setSelectedDistrict}
//                   style={styles.picker}
//                   dropdownIconColor="#718096"
//                 >
//                   <Picker.Item label="All Districts" value="" />
//                   {districts.map((district) => (
//                     <Picker.Item
//                       key={district}
//                       label={district}
//                       value={district}
//                     />
//                   ))}
//                 </Picker>
//               </View>
//             )}
//           </View>

//           {isOffline && (
//             <View style={styles.offlineBanner}>
//               <MaterialIcons name="signal-wifi-off" size={16} color="#fff" />
//               <Text style={styles.offlineText}>
//                 Offline Mode - Showing cached data
//               </Text>
//             </View>
//           )}
//         </View>

//         {/* Results */}
//         {loading ? (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="large" color="#4a6da7" />
//           </View>
//         ) : (
//           <View style={styles.resultsContainer}>
//             <View style={styles.resultsHeader}>
//               <Text style={styles.resultsTitle}>
//                 {filteredContacts.length}{" "}
//                 {filteredContacts.length === 1 ? "Station" : "Stations"}
//               </Text>
//               {syncing && (
//                 <ActivityIndicator
//                   size="small"
//                   color="#4a6da7"
//                   style={{ marginLeft: 8 }}
//                 />
//               )}
//             </View>

//             {filteredContacts.length === 0 ? (
//               <View style={styles.emptyState}>
//                 <FontAwesome5 name="building" size={40} color="#cbd5e0" />
//                 <Text style={styles.emptyText}>No stations found</Text>
//                 <Text style={styles.emptySubtext}>
//                   Try adjusting your search filters
//                 </Text>
//               </View>
//             ) : (
//               <FlatList
//                 data={filteredContacts}
//                 renderItem={renderContactItem}
//                 keyExtractor={(item) => item.id}
//                 scrollEnabled={false}
//                 contentContainerStyle={{ paddingBottom: 20 }}
//               />
//             )}
//           </View>
//         )}
//       </ScrollView>
//     </GestureHandlerRootView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f8fafc",
//   },
//   contentContainer: {
//     paddingBottom: 32,
//   },
//   filterContainer: {
//     padding: 16,
//     backgroundColor: "#fff",
//     marginBottom: 16,
//     borderRadius: 12,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 3,
//     elevation: 1,
//   },
//   searchInput: {
//     height: 48,
//     paddingHorizontal: 16,
//     backgroundColor: "#f7fafc",
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     fontSize: 16,
//     color: "#2d3748",
//     marginBottom: 12,
//   },
//   pickerRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//   },
//   pickerContainer: {
//     flex: 1,
//     borderWidth: 1,
//     borderColor: "#e2e8f0",
//     borderRadius: 8,
//     backgroundColor: "#f7fafc",
//     overflow: "hidden",
//   },
//   picker: {
//     // height: 48,
//     width: "100%",
//     color: "#2d3748",
//   },
//   offlineBanner: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#e53e3e",
//     padding: 8,
//     borderRadius: 4,
//     marginTop: 12,
//   },
//   offlineText: {
//     color: "#fff",
//     marginLeft: 8,
//     fontSize: 12,
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 32,
//   },
//   resultsContainer: {
//     paddingHorizontal: 16,
//   },
//   resultsHeader: {
//     flexDirection: "row",
//     alignItems: "center",
//     marginBottom: 12,
//   },
//   resultsTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#2d3748",
//   },
//   contactCard: {
//     backgroundColor: "#fff",
//     // borderRadius: 8,
//     padding: 16,
//     // marginBottom: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#e2e8f0",

//     flexDirection: "row",
//     alignItems: "center",
//     // shadowColor: '#000',
//     // shadowOffset: { width: 0, height: 1 },
//     // shadowOpacity: 0.05,
//     // shadowRadius: 3,
//     // elevation: 1,
//   },
//   contactIcon: {
//     backgroundColor: "#ebf2ff",
//     padding: 10,
//     borderRadius: 8,
//     marginRight: 16,
//   },
//   contactInfo: {
//     flex: 1,
//   },
//   stationName: {
//     fontSize: 16,
//     fontWeight: "600",
//     color: "#2d3748",
//     marginBottom: 4,
//   },
//   locationText: {
//     fontSize: 13,
//     color: "#718096",
//   },
//   emptyState: {
//     backgroundColor: "#fff",
//     borderRadius: 8,
//     padding: 32,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   emptyText: {
//     fontSize: 16,
//     color: "#4a5568",
//     marginTop: 16,
//     fontWeight: "500",
//   },
//   emptySubtext: {
//     fontSize: 14,
//     color: "#a0aec0",
//     marginTop: 4,
//   },
// });

// export default EmergencyContacts;

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  StatusBar,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  FontAwesome5,
  Ionicons,
  MaterialIcons,
  Feather,
} from "@expo/vector-icons";
import pb from "../../lib/connection";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter } from "expo-router";
import * as Network from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const { width, height } = Dimensions.get("window");

// Zimbabwe provinces and districts
const zimbabweProvinces = {
  Bulawayo: ["Bulawayo"],
  Harare: ["Harare"],
  Manicaland: [
    "Buhera",
    "Chimanimani",
    "Chipinge",
    "Makoni",
    "Mutare",
    "Mutasa",
    "Nyanga",
  ],
  "Mashonaland Central": [
    "Bindura",
    "Guruve",
    "Mazowe",
    "Mbire",
    "Mount Darwin",
    "Muzarabani",
    "Rushinga",
    "Shamva",
  ],
  "Mashonaland East": [
    "Chikomba",
    "Goromonzi",
    "Marondera",
    "Mudzi",
    "Murehwa",
    "Mutoko",
    "Seke",
    "UMP",
    "Wedza",
  ],
  "Mashonaland West": [
    "Chegutu",
    "Hurungwe",
    "Kariba",
    "Makonde",
    "Mhondoro-Ngezi",
    "Zvimba",
    "Sanyati",
    "Kadoma",
  ],
  Masvingo: [
    "Bikita",
    "Chiredzi",
    "Chivi",
    "Gutu",
    "Masvingo",
    "Mwenezi",
    "Zaka",
  ],
  "Matabeleland North": [
    "Binga",
    "Bubi",
    "Hwange",
    "Lupane",
    "Nkayi",
    "Tsholotsho",
    "Umguza",
  ],
  "Matabeleland South": [
    "Beitbridge",
    "Bulilima",
    "Gwanda",
    "Insiza",
    "Mangwe",
    "Matobo",
    "Umzingwane",
  ],
  Midlands: [
    "Chirumhanzu",
    "Gokwe North",
    "Gokwe South",
    "Gweru",
    "Kwekwe",
    "Mberengwa",
    "Shurugwi",
    "Zvishavane",
  ],
};

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districts, setDistricts] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const router = useRouter();

  // Animation values
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  // Load contacts from cache or API
  useEffect(() => {
    const loadData = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        setIsOffline(!networkState.isConnected);

        const cachedContacts = await AsyncStorage.getItem("emergencyContacts");
        if (cachedContacts) {
          setContacts(JSON.parse(cachedContacts));
          setFilteredContacts(JSON.parse(cachedContacts));
        }

        if (networkState.isConnected) {
          await fetchContacts();
        } else if (!cachedContacts) {
          Alert.alert(
            "Offline",
            "No cached data available. Please connect to the internet to load contacts."
          );
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
        // Animate content in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }
    };

    loadData();
  }, []);

  const fetchContacts = async () => {
    setSyncing(true);
    try {
      const records = await pb.collection("contacts").getFullList();
      setContacts(records);
      setFilteredContacts(records);
      await AsyncStorage.setItem("emergencyContacts", JSON.stringify(records));
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      Alert.alert("Error", "Failed to sync contacts. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  // Update districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      setDistricts(zimbabweProvinces[selectedProvince] || []);
      setSelectedDistrict("");
    } else {
      setDistricts([]);
      setSelectedDistrict("");
    }
  }, [selectedProvince]);

  // Count active filters
  useEffect(() => {
    let count = 0;
    if (selectedProvince) count++;
    if (selectedDistrict) count++;
    if (searchTerm) count++;
    setActiveFiltersCount(count);
  }, [selectedProvince, selectedDistrict, searchTerm]);

  // Apply filters when any filter changes
  useEffect(() => {
    let results = contacts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(
        (contact) =>
          contact.station.toLowerCase().includes(term) ||
          (contact.member_in_charge &&
            contact.member_in_charge.toLowerCase().includes(term)) ||
          (contact.specialty && contact.specialty.toLowerCase().includes(term))
      );
    }

    if (selectedProvince) {
      results = results.filter(
        (contact) => contact.province === selectedProvince
      );
    }

    if (selectedDistrict) {
      results = results.filter(
        (contact) => contact.district === selectedDistrict
      );
    }

    setFilteredContacts(results);
  }, [searchTerm, selectedProvince, selectedDistrict, contacts]);

  const handleContactPress = (contact) => {
    router.push({
      pathname: "/contactDetails",
      params: {
        id: contact.id,
        station: contact.station,
        province: contact.province,
        district: contact.district,
        station_number: contact.station_number,
        whatsapp_number: contact.whatsapp_number,
        member_in_charge: contact.member_in_charge,
        member_in_charge_number: contact.member_in_charge_number,
        specialty: contact.specialty,
      },
    });
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedProvince("");
    setSelectedDistrict("");
    setFilterModalVisible(false);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <View style={styles.titleSection}>
          <Text style={styles.headerTitle}>Emergency Stations</Text>
          <Text style={styles.headerSubtitle}>
            {filteredContacts.length} stations available
          </Text>
        </View>
        <TouchableOpacity
          onPress={fetchContacts}
          disabled={syncing}
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        >
          <MaterialIcons
            name="sync"
            size={20}
            color={syncing ? "#94a3b8" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="signal-wifi-off" size={16} color="#ef4444" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}
    </View>
  );

  const renderSearchAndFilters = () => (
    <View style={styles.searchFilterContainer}>
      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={20}
          color="#64748b"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stations, officers, specialties..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchTerm("")}
            style={styles.clearSearchButton}
          >
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.filterButton,
          activeFiltersCount > 0 && styles.filterButtonActive,
        ]}
        onPress={() => setFilterModalVisible(true)}
      >
        <Feather
          name="filter"
          size={18}
          color={activeFiltersCount > 0 ? "#fff" : "#64748b"}
        />
        {activeFiltersCount > 0 && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Stations</Text>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Province</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedProvince}
                  onValueChange={setSelectedProvince}
                  style={styles.modalPicker}
                >
                  <Picker.Item label="All Provinces" value="" />
                  {Object.keys(zimbabweProvinces).map((province) => (
                    <Picker.Item
                      key={province}
                      label={province}
                      value={province}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {selectedProvince && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>District</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedDistrict}
                    onValueChange={setSelectedDistrict}
                    style={styles.modalPicker}
                  >
                    <Picker.Item label="All Districts" value="" />
                    {districts.map((district) => (
                      <Picker.Item
                        key={district}
                        label={district}
                        value={district}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            {activeFiltersCount > 0 && (
              <View style={styles.activeFiltersSection}>
                <Text style={styles.filterSectionTitle}>Active Filters</Text>
                <View style={styles.activeFiltersContainer}>
                  {selectedProvince && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>
                        {selectedProvince}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedProvince("")}>
                        <Ionicons name="close" size={16} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedDistrict && (
                    <View style={styles.activeFilterChip}>
                      <Text style={styles.activeFilterText}>
                        {selectedDistrict}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedDistrict("")}>
                        <Ionicons name="close" size={16} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {activeFiltersCount > 0 && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearAllFilters}
              >
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderContactItem = ({ item, index }) => (
    <Animated.View
      style={[
        styles.contactCardWrapper,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim,
            },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => handleContactPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contactCardContent}>
          <View style={styles.contactIconContainer}>
            <View style={styles.contactIcon}>
              <FontAwesome5 name="building" size={18} color="#6366f1" />
            </View>
          </View>

          <View style={styles.contactInfo}>
            <Text style={styles.stationName} numberOfLines={1}>
              {item.station}
            </Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#64748b" />
              <Text style={styles.locationText} numberOfLines={1}>
                {item.district}, {item.province}
              </Text>
            </View>
            {item.specialty && (
              <View style={styles.specialtyContainer}>
                <View style={styles.specialtyBadge}>
                  <Text style={styles.specialtyText}>{item.specialty}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.contactActions}>
            <TouchableOpacity style={styles.quickCallButton}>
              <Ionicons name="call" size={16} color="#10b981" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <View style={styles.emptyIconContainer}>
        <FontAwesome5 name="search" size={48} color="#e2e8f0" />
      </View>
      <Text style={styles.emptyTitle}>No stations found</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your search terms or filters
      </Text>
      {activeFiltersCount > 0 && (
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={clearAllFilters}
        >
          <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  if (loading) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#6366f1" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading stations...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366f1" />

      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {renderHeader()}
      {renderSearchAndFilters()}

      <View style={styles.contentContainer}>
        {filteredContacts.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={renderContactItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        )}
      </View>

      {renderFilterModal()}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerContainer: {
    backgroundColor: "#2563eb",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#c7d2fe",
    opacity: 0.9,
  },
  syncButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 50,
  },
  syncButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  offlineText: {
    color: "#ef4444",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  searchFilterContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#1e293b",
  },
  clearSearchButton: {
    padding: 4,
  },
  filterButton: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingVertical: 20,
  },
  contactCardWrapper: {
    marginBottom: 0,
  },
  contactCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contactCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactIconContainer: {
    marginRight: 16,
  },
  contactIcon: {
    backgroundColor: "#eef2ff",
    padding: 12,
    borderRadius: 12,
  },
  contactInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#64748b",
    marginLeft: 4,
    flex: 1,
  },
  specialtyContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  specialtyBadge: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#0ea5e9",
  },
  specialtyText: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "500",
  },
  contactActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickCallButton: {
    backgroundColor: "#f0fdf4",
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  clearFiltersButtonText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  pickerWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalPicker: {
    color: "#1e293b",
  },
  activeFiltersSection: {
    marginBottom: 24,
  },
  activeFiltersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  activeFilterText: {
    color: "#6366f1",
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  clearFiltersText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "600",
  },
  applyFiltersButton: {
    flex: 2,
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  applyFiltersText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default EmergencyContacts;
