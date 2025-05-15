import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native'
import React, { Component, useState } from 'react'
import pb from '../../lib/connection';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, TextInput } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

export default TrackCase = () => {
      const [caseDetails, setCaseDetails] = useState(null);
        const [caseId, setCaseId] = useState('');
        const [loading, setLoading] = useState(false);
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
    return (
        <View className="bg-gray-50 flex-1">
             <Stack.Screen options={{
            title: 'Track Case',
            headerShown: true,
            headerTitleStyle: {
                fontWeight: '600',
                fontSize: 18
            },
            headerRight: () => (
 <Image
                  source={require('../../assets/images/logo.jpg')} 
                className="logoHeader"
                />            )
        }} />
      <GestureHandlerRootView >
       
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
          <View className="bg-white rounded-2xl p-5 shadow-sm">
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
      </GestureHandlerRootView>
      </View>
    )
  }