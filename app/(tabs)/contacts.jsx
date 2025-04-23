import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, FlatList, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import pb from '../../lib/connection';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);
  const router = useRouter();

  // Load contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const records = await pb.collection('contacts').getFullList();
        setContacts(records);
        setFilteredContacts(records);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

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
        contact.member_in_charge.toLowerCase().includes(term) ||
        contact.specialty.toLowerCase().includes(term)
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
      className="bg-white rounded-xl p-5 mb-3 shadow-sm"
      onPress={() => handleContactPress(item)}
    >
      <View className="flex-row items-center mb-2">
        <View className="bg-blue-100 p-2 rounded-lg mr-4">
          <FontAwesome5 name="building" size={16} color="#2563eb" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">{item.station}</Text>
          <Text className="text-gray-500 text-sm">{item.province} - {item.district}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>
      <Text className="text-gray-900 mt-2">
        <Text className="font-medium">{item.member_in_charge}</Text>
        <Text className="text-gray-500"> ({item.specialty})</Text>
      </Text>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView className="bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <Stack.Screen options={{ 
          title: "Station Contacts",
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18
          },
          headerShown: true,
        }} />
        
        <View className="px-5 pt-6">
          {/* Search and Filters */}
          <View style={{backgroundColor:'#2563eb'}} className="text-white rounded-2xl p-5 mb-6 shadow-sm">
            <View className="flex-row items-center mb-4">
              <View className="bg-blue-100 p-2 rounded-lg mr-4">
                <FontAwesome5 name="search" size={16} color="#2563eb" />
              </View>
              <View>
                <Text className="text-lg font-semibold text-white">Find Stations</Text>
                <Text className="text-gray-50 text-sm">Search by location or specialty</Text>
              </View>
            </View>
            
            <TextInput
              className="h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg text-base mb-4"
              placeholder="Search stations or officers"
              placeholderTextColor="#9ca3af"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            
            <View className="mb-3">
              <Text className="text-gray-50 text-sm mb-1">Province</Text>
              <View className="border border-gray-200 rounded-lg bg-gray-50">
                <Picker
                  selectedValue={selectedProvince}
                  onValueChange={(value) => setSelectedProvince(value)}
                  dropdownIconColor="#6b7280"
                >
                  <Picker.Item label="All Provinces" value="" />
                  {Object.keys(zimbabweProvinces).map((province) => (
                    <Picker.Item key={province} label={province} value={province} />
                  ))}
                </Picker>
              </View>
            </View>

            {selectedProvince && (
              <View className="mb-3">
                <Text className="text-gray-600 text-sm mb-1">District</Text>
                <View className="border border-gray-200 rounded-lg bg-gray-50">
                  <Picker
                    selectedValue={selectedDistrict}
                    onValueChange={(value) => setSelectedDistrict(value)}
                    dropdownIconColor="#6b7280"
                  >
                    <Picker.Item label="All Districts" value="" />
                    {districts.map((district) => (
                      <Picker.Item key={district} label={district} value={district} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}
          </View>

          {/* Results */}
          {loading ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <View>
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                {filteredContacts.length} {filteredContacts.length === 1 ? 'Station' : 'Stations'} Found
              </Text>
              
              {filteredContacts.length === 0 ? (
                <View className="bg-white rounded-xl p-6 items-center justify-center">
                  <FontAwesome5 name="building" size={32} color="#9ca3af" className="mb-3" />
                  <Text className="text-gray-500 text-center">No stations match your search criteria</Text>
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
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

export default EmergencyContacts;