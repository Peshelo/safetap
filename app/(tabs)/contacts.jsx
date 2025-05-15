import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  ActivityIndicator, 
  FlatList, 
  Image, 
  StatusBar,
  StyleSheet,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import pb from '../../lib/connection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

// Zimbabwe provinces and districts
const zimbabweProvinces = {
  "Bulawayo": ["Bulawayo"],
  "Harare": ["Harare"],
  "Manicaland": ["Buhera", "Chimanimani", "Chipinge", "Makoni", "Mutare", "Mutasa", "Nyanga"],
  "Mashonaland Central": ["Bindura", "Guruve", "Mazowe", "Mbire", "Mount Darwin", "Muzarabani", "Rushinga", "Shamva"],
  "Mashonaland East": ["Chikomba", "Goromonzi", "Marondera", "Mudzi", "Murehwa", "Mutoko", "Seke", "UMP", "Wedza"],
  "Mashonaland West": ["Chegutu", "Hurungwe", "Kariba", "Makonde", "Mhondoro-Ngezi", "Zvimba", "Sanyati", "Kadoma"],
  "Masvingo": ["Bikita", "Chiredzi", "Chivi", "Gutu", "Masvingo", "Mwenezi", "Zaka"],
  "Matabeleland North": ["Binga", "Bubi", "Hwange", "Lupane", "Nkayi", "Tsholotsho", "Umguza"],
  "Matabeleland South": ["Beitbridge", "Bulilima", "Gwanda", "Insiza", "Mangwe", "Matobo", "Umzingwane"],
  "Midlands": ["Chirumhanzu", "Gokwe North", "Gokwe South", "Gweru", "Kwekwe", "Mberengwa", "Shurugwi", "Zvishavane"]
};

const EmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const [isOffline, setIsOffline] = useState(false);
  const router = useRouter();

  // Load contacts from cache or API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check network status
        const networkState = await Network.getNetworkStateAsync();
        setIsOffline(!networkState.isConnected);

        // Try to load from cache first
        // const cachedContacts = await SecureStore.getItemAsync('emergencyContacts');
        const cachedContacts = await AsyncStorage.getItem('emergencyContacts');
        if (cachedContacts) {
          setContacts(JSON.parse(cachedContacts));
          setFilteredContacts(JSON.parse(cachedContacts));
        }

        // Fetch fresh data if online
        if (networkState.isConnected) {
          await fetchContacts();
        } else if (!cachedContacts) {
          Alert.alert("Offline", "No cached data available. Please connect to the internet to load contacts.");
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const fetchContacts = async () => {
    setSyncing(true);
    try {
      const records = await pb.collection('contacts').getFullList();
      setContacts(records);
      setFilteredContacts(records);
      await SecureStore.setItemAsync('emergencyContacts', JSON.stringify(records));
      // await AsyncStorage.setItem('emergencyContacts', JSON.stringify(records));
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
      Alert.alert("Error", "Failed to sync contacts. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  // Update districts when province changes
  useEffect(() => {
    if (selectedProvince) {
      setDistricts(zimbabweProvinces[selectedProvince] || []);
      setSelectedDistrict('');
    } else {
      setDistricts([]);
      setSelectedDistrict('');
    }
  }, [selectedProvince]);

  // Apply filters when any filter changes
  useEffect(() => {
    let results = contacts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(contact => 
        contact.station.toLowerCase().includes(term) ||
        (contact.member_in_charge && contact.member_in_charge.toLowerCase().includes(term)) ||
        (contact.specialty && contact.specialty.toLowerCase().includes(term))
      );
    }

    if (selectedProvince) {
      results = results.filter(contact => contact.province === selectedProvince);
    }

    if (selectedDistrict) {
      results = results.filter(contact => contact.district === selectedDistrict);
    }

    setFilteredContacts(results);
  }, [searchTerm, selectedProvince, selectedDistrict, contacts]);

  const handleContactPress = (contact) => {
    router.push({
      pathname: '/contactDetails',
      params: { 
        id: contact.id,
        station: contact.station,
        province: contact.province,
        district: contact.district,
        station_number: contact.station_number,
        whatsapp_number: contact.whatsapp_number,
        member_in_charge: contact.member_in_charge,
        member_in_charge_number: contact.member_in_charge_number,
        specialty: contact.specialty
      }
    });
  };

  const renderContactItem = ({ item }) => (
    <TouchableOpacity
      style={styles.contactCard}
      onPress={() => handleContactPress(item)}
      activeOpacity={0.8}
    >
      <View style={styles.contactIcon}>
        <FontAwesome5 name="building" size={16} color="#4a6da7" />
      </View>
      <View style={styles.contactInfo}>
        <Text style={styles.stationName}>{item.station}</Text>
        <Text style={styles.locationText}>{item.province} • {item.district}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#a0aec0" />
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle={'dark-content'} backgroundColor={'#fff'} />
      
      <Stack.Screen  options={{ 
        title: 'Stations',
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity onPress={fetchContacts} disabled={syncing}>
            <MaterialIcons 
              name="sync" 
              size={24} 
              color={syncing ? '#cbd5e0' : '#4a6da7'} 
              style={{ marginRight: 15 }} 
            />
          </TouchableOpacity>
        )
      }} />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search and Filters */}
        <View style={styles.filterContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search stations..."
            placeholderTextColor="#a0aec0"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          
          <View style={styles.pickerRow}>
            <View style={[styles.pickerContainer, { marginRight: 10 }]}>
              <Picker
                selectedValue={selectedProvince}
                onValueChange={setSelectedProvince}
                style={styles.picker}
                dropdownIconColor="#718096"
              >
                <Picker.Item label="All Provinces" value="" />
                {Object.keys(zimbabweProvinces).map((province) => (
                  <Picker.Item key={province} label={province} value={province} />
                ))}
              </Picker>
            </View>

            {selectedProvince && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDistrict}
                  onValueChange={setSelectedDistrict}
                  style={styles.picker}
                  dropdownIconColor="#718096"
                >
                  <Picker.Item label="All Districts" value="" />
                  {districts.map((district) => (
                    <Picker.Item key={district} label={district} value={district} />
                  ))}
                </Picker>
              </View>
            )}
          </View>
          
          {isOffline && (
            <View style={styles.offlineBanner}>
              <MaterialIcons name="signal-wifi-off" size={16} color="#fff" />
              <Text style={styles.offlineText}>Offline Mode - Showing cached data</Text>
            </View>
          )}
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a6da7" />
          </View>
        ) : (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {filteredContacts.length} {filteredContacts.length === 1 ? 'Station' : 'Stations'}
              </Text>
              {syncing && <ActivityIndicator size="small" color="#4a6da7" style={{ marginLeft: 8 }} />}
            </View>
            
            {filteredContacts.length === 0 ? (
              <View style={styles.emptyState}>
                <FontAwesome5 name="building" size={40} color="#cbd5e0" />
                <Text style={styles.emptyText}>No stations found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search filters</Text>
              </View>
            ) : (
              <FlatList
                data={filteredContacts}
                renderItem={renderContactItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        )}
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  searchInput: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#2d3748',
    marginBottom: 12,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    overflow: 'hidden',
  },
  picker: {
    // height: 48,
    width: '100%',
    color: '#2d3748',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e53e3e',
    padding: 8,
    borderRadius: 4,
    marginTop: 12,
  },
  offlineText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  resultsContainer: {
    paddingHorizontal: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
  },
  contactCard: {
    backgroundColor: '#fff',
    // borderRadius: 8,
    padding: 16,
    // marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',

    flexDirection: 'row',
    alignItems: 'center',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.05,
    // shadowRadius: 3,
    // elevation: 1,
  },
  contactIcon: {
    backgroundColor: '#ebf2ff',
    padding: 10,
    borderRadius: 8,
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#718096',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#4a5568',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a0aec0',
    marginTop: 4,
  },
});

export default EmergencyContacts;