import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import pb from '../../lib/connection';

const Home = () => {
  const [caseId, setCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [caseDetails, setCaseDetails] = useState(null);
  const [error, setError] = useState(null);

  const handleSearchCase = async () => {
    if (!caseId.trim()) {
      setError('Please enter a case ID');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const record = await pb.collection('cases').getOne(caseId);
      setCaseDetails(record);
    } catch (err) {
      setError('Case not found. Please check your ID and try again.');
      setCaseDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const makeEmergencyCall = (number) => {
    const url = `tel:${number}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not make the call'));
  };

  const emergencyActions = [
    {
      title: 'Police',
      subtitle: 'Emergency',
      number: '999',
      icon: 'shield-alt',
      color: '#2563eb',
      bgColor: '#eff6ff'
    },
    {
      title: 'Ambulance',
      subtitle: 'Medical',
      number: '994',
      icon: 'ambulance',
      color: '#dc2626',
      bgColor: '#fef2f2'
    },
    {
      title: 'Fire',
      subtitle: 'Brigade',
      number: '993',
      icon: 'fire-extinguisher',
      color: '#ea580c',
      bgColor: '#fff7ed'
    },
    {
      title: 'ZRP',
      subtitle: 'Hotline',
      number: '0242 700 171',
      icon: 'phone-alt',
      color: '#059669',
      bgColor: '#ecfdf5'
    }
  ];

  return (
    <ScrollView className="bg-gray-50 flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ 
        title: "Safety Hub",
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18
        }
      }} />
      
      <View className="px-5 pt-6">
        {/* Emergency Quick Access */}
        <View className="mb-8">
          <Text className="text-2xl font-bold mb-5 text-gray-900">Emergency Services</Text>
          
          <View className="flex-row flex-wrap justify-between h-fit" style={{ gap: 12 }}>
            {emergencyActions.map((action, index) => (
              <View key={index} className="w-[48%] h-fit">
                <TouchableOpacity
                  onPress={() => makeEmergencyCall(action.number)}
                >
                  <View 
                    className="rounded-xl p-4 h-fit"
                    style={{ backgroundColor: action.color }}
                  >
                    <View className="flex-row items-center  mb-3">
                      <View className="w-10 h-10 rounded-lg items-center justify-center mr-3" 
                        style={{ backgroundColor: action.bgColor + '50' }}>
                        <FontAwesome5 
                          name={action.icon} 
                          size={18} 
                          color={action.bgColor} 
                        />
                      </View>
                      <View>
                        <Text className="text-base font-semibold text-white">
                          {action.title}
                        </Text>
                        <Text className="text-xs text-gray-50">
                          {action.subtitle}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-lg font-bold" style={{ color: action.bgColor }}>
                      {action.number}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Case Status Section */}
        <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm">
          <View className="flex-row items-center mb-5">
            <View className="bg-blue-100 p-2 rounded-lg mr-4">
              <Ionicons name="document-text" size={20} color="#2563eb" />
            </View>
            <View>
              <Text className="text-lg font-semibold text-gray-900">Case Tracking</Text>
              <Text className="text-gray-500 text-sm">Check your reported case status</Text>
            </View>
          </View>
          
          <View className="flex-row items-center mb-1">
            <TextInput
              className="flex-1 h-12 px-4 bg-gray-50 border border-gray-200 rounded-l-lg text-base"
              placeholder="Enter case ID"
              placeholderTextColor="#9ca3af"
              value={caseId}
              onChangeText={setCaseId}
              onSubmitEditing={handleSearchCase}
            />
            <TouchableOpacity 
              className="h-12 w-12 items-center justify-center bg-blue-600 rounded-r-lg"
              onPress={handleSearchCase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="search" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
          
          {error && (
            <Text className="text-red-500 text-xs mt-1 ml-1">{error}</Text>
          )}
        </View>

        {/* Case Details Card */}
        {caseDetails && (
          <View className="bg-white rounded-2xl p-5 mb-8 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Case Details</Text>
              <View className={`px-2 py-1 rounded-full ${
                caseDetails.status === 'Open' ? 'bg-amber-100' : 
                caseDetails.status === 'Resolved' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Text className={`text-xs font-medium ${
                  caseDetails.status === 'Open' ? 'text-amber-800' : 
                  caseDetails.status === 'Resolved' ? 'text-green-800' : 'text-gray-800'
                }`}>
                  {caseDetails.status}
                </Text>
              </View>
            </View>
            
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">Case ID</Text>
                <Text className="text-gray-900 text-sm font-medium">{caseDetails.id}</Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">Type</Text>
                <Text className="text-gray-900 text-sm font-medium">{caseDetails.title}</Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">Date Reported</Text>
                <Text className="text-gray-900 text-sm font-medium">
                  {new Date(caseDetails.created).toLocaleDateString()}
                </Text>
              </View>
              
              <View className="pt-2">
                <Text className="text-gray-500 text-sm mb-1">Description</Text>
                <Text className="text-gray-900 text-sm leading-5">{caseDetails.description}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View>
          <Text className="text-2xl font-bold mb-5 text-gray-900">Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between" style={{ gap: 12 }}>
            {[
              { title: 'Report Crime', icon: 'police-badge', color: '#2563eb', number: '999' },
              { title: 'Medical Help', icon: 'ambulance', color: '#dc2626', number: '994' },
              { title: 'Fire Emergency', icon: 'fire-extinguisher', color: '#ea580c', number: '993' },
              { title: 'Other Help', icon: 'alert-circle', color: '#059669', number: '0242700171' },
            ].map((action, index) => (
              <View key={index} className="w-[48%]">
                <TouchableOpacity 
                  className="bg-white rounded-xl p-4 h-fit shadow-sm"
                  onPress={() => makeEmergencyCall(action.number)}
                >
                  <View className="items-center">
                    <View className="w-12 h-12 rounded-full items-center justify-center mb-3" 
                      style={{ backgroundColor: action.color + '20' }}>
                      <MaterialCommunityIcons 
                        name={action.icon} 
                        size={20} 
                        color={action.color}
                      />
                    </View>
                    <Text className="text-sm font-medium text-center text-gray-900">
                      {action.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default Home;