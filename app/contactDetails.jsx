import React from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';

const ContactDetails = () => {
  const params = useLocalSearchParams();

  const openWhatsApp = (number) => {
    // const url = `https://wa.me/${number}?text=${encodeURIComponent("hi there")}`;
    const url = `https://wa.me/${number}`;

    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const makePhoneCall = (number) => {
    var url = null;
    if (number.toString().includes('263')){
    url = `tel:+${number}`;

    }else{
      
    url = `tel:${number}`;
    }
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not make phone call'));
  };

  return (
    <View className="bg-gray-50 flex-1 p-5">
      <Stack.Screen options={{ 
        title: params.station,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18
        }
      }} />
      
      <View className="bg-white rounded-2xl p-6 shadow-sm">
        <Text className="text-xl font-semibold text-gray-900 mb-2">{params.station}</Text>
        <Text className="text-gray-500 text-sm mb-5">{params.province} - {params.district}</Text>
        
        <View className="border-b border-gray-200 pb-4 mb-4">
          <Text className="text-gray-500 text-sm mb-1">Station Number</Text>
          <Text className="text-gray-900 text-base font-medium">{params.station_number.toString().includes('263') ? '+' : ''}{params.station_number}</Text>
        </View>

        <View className="border-b border-gray-200 pb-4 mb-6">
          <Text className="text-gray-500 text-sm mb-1">Member in Charge</Text>
          <Text className="text-gray-900 text-base font-medium mb-1">
            {params.member_in_charge}
          </Text>
          <Text className="text-gray-900 text-base">{params.member_in_charge.toString().includes('263') ? '+' : ''}{params.member_in_charge_number}</Text>
        </View>

        <View className="flex-row justify-between">
         {params.station_number && 
         <TouchableOpacity 
            className="flex-1 bg-blue-600 py-3 px-4 rounded-lg flex-row items-center justify-center mr-2"
            onPress={() => makePhoneCall(params.station_number)}
          >
            <FontAwesome5 name="phone" size={18} color="white" />
            <Text className="text-white font-medium ml-2">Call Station</Text>
          </TouchableOpacity>
         } 
          
          {params.member_in_charge_number && (
            <TouchableOpacity 
              className="w-fit flex flex-row space-x-4 p-2 px-4 h-12 bg-green-500 rounded-lg items-center justify-center mx-1"
              onPress={() => makePhoneCall(params.member_in_charge_number)}
            >
                            <FontAwesome5 name="user" size={18} color="white" />

              <Text className="text-white font-bold ml-2">Call OIC</Text>
            </TouchableOpacity>
          )}
          
          {params.whatsapp_number &&
          <TouchableOpacity 
            className="w-12 h-12 bg-green-600 rounded-lg items-center justify-center ml-2"
            onPress={() => openWhatsApp(params.whatsapp_number)}
          >
            <FontAwesome5 name="whatsapp" size={18} color="white" />
          </TouchableOpacity>
          }
        </View>
      </View>

      {/* Additional Information Section */}
      <View className="bg-white rounded-2xl p-6 mt-4 shadow-sm">
        <Text className="text-lg font-semibold text-gray-900 mb-3">About This Station</Text>
        <Text className="text-gray-500 text-sm">
          This police station serves the {params.district} district. For emergencies, 
          please call directly or use the quick action buttons above.
        </Text>
      </View>
    </View>
  );
};

export default ContactDetails;