import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert, Vibration, StyleSheet, Image, StatusBar, FlatList, RefreshControl } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import pb from '../../lib/connection';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Home = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userPhone, setUserPhone] = useState(null);
  const [newsArticles, setNewsArticles] = useState([]);
  // SOS state
  const [sosCountdown, setSosCountdown] = useState(3);
  const [isSosPressed, setIsSosPressed] = useState(false);
  const [userLocation, setUserLocation] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserPhone = async () => {
    const savedInfo = await SecureStore.getItemAsync('userEmergencyInfo');
    const userInfo = JSON.parse(savedInfo);
    if (userInfo) {
      setUserPhone(userInfo.phoneNumber);
    }
  };

  const fetchNewsArticles = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('news').getFullList({
        sort: '-created',
      });
      setNewsArticles(records);
    } catch (err) {
      setError('Failed to fetch news articles');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserPhone();
    getLocation();
    fetchNewsArticles();
  }, []);

  const getLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for SOS.');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    setUserLocation(`${latitude},${longitude}`);
  };

  // SOS countdown effect
  useEffect(() => {
    let timer;
    if (isSosPressed && sosCountdown > 0) {
      timer = setTimeout(() => {
        setSosCountdown(sosCountdown - 1);
        Vibration.vibrate(500);
      }, 1000);
    } else if (sosCountdown === 0) {
      triggerSOS();
    }
    return () => clearTimeout(timer);
  }, [isSosPressed, sosCountdown]);

  const triggerSOS = async () => {
    const formData = new FormData();
    formData.append("title", "SOS Alert");
    formData.append("description", "Emergency SOS alert triggered.");
    formData.append("latitude", userLocation.split(',')[0]);
    formData.append("longitude", userLocation.split(',')[1]);
    formData.append("merchant", "oi2mnpx4rc6i655");
    formData.append("status", "Open");
    formData.append("priority", "red");

    try {
      const emergencyContact = userPhone;
      if (emergencyContact) {  
        formData.append("phoneNumber", emergencyContact);
      } else {
        Alert.alert('Setup Contact to use SOS', 'No emergency contact found. Please set it up in your profile.',
          [
            { text: 'Cancel', style: 'cancel'},
            { text: 'Set up now', onPress: () => router.push('./about'), isPreferred: true },
          ],
          { cancelable: true }
        );
        return;
      }

      if (!userLocation) {
        Alert.alert('Error', 'Unable to fetch your location. Please try again.');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for SOS.');
        return;
      }

      await pb.collection('cases').create(formData);
      Alert.alert('SOS Sent!', `Emergency services have been alerted. Your location: ${userLocation}`);
    } catch (error) {
      Alert.alert('Error', 'Unable to send SOS alert.' + error);
    }

    setIsSosPressed(false);
    setSosCountdown(3);
  };

  const makeEmergencyCall = (number) => {
    const url = `tel:${number}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not make the call'));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNewsArticles();
  };

  const emergencyActions = [
    {
      title: 'Police Hotline',
      subtitle: 'Toll free',
      number: '08005462',
      icon: 'shield-alt',
      color: '#2563eb',
      bgColor: '#eff6ff',
      path: null
    },
    {
      title: 'Emergency',
      subtitle: 'Call Center',
      number: '911',
      icon: 'phone',
      color: '#dc2626',
      bgColor: '#fef2f2',
      path: null
    },
    {
      title: 'Child Helpline',
      subtitle: 'Toll free',
      number: '+263242255583',
      icon: 'child',
      color: '#ea580c',
      bgColor: '#fff7ed',
      path: null
    },
    {
      title: 'Find Police Station',
      subtitle: 'Get a list of police stations',
      number: null,
      icon: 'arrow-right',
      color: '#059669',
      bgColor: '#ecfdf5',
      path: "(tabs)/contacts"
    }
  ];

  const renderNewsItem = ({ item }) => (
    <TouchableOpacity 
      onPress={() => router.push(`/news/${item.id}`)}
      className="mb-4"
    >
      <View className="bg-white rounded-xl overflow-hidden shadow-sm">
        {item.image && (
          <Image 
            source={{ uri: pb.getFileUrl(item, item.image) }}
            className="w-full h-40"
            resizeMode="cover"
          />
        )}
        <View className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-1">{item.title}</Text>
          <Text className="text-gray-500 text-sm mb-2">
            {item.description?.replace(/<[^>]*>/g, '').substring(0, 60)}...
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#9ca3af" />
            <Text className="text-gray-400 text-xs ml-1">
              {new Date(item.created).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-gray-50">
      <StatusBar barStyle={'dark-content'} backgroundColor={'#fff'} />
      <Stack.Screen options={{ 
        title: 'Services',
        headerShown: true,
        headerRight: () => (
          <Image
            source={require('../../assets/images/logo.jpg')} 
            className="w-10 h-10 rounded-full"
          />
        )
      }} />
      
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        <View className="px-5 pt-6">
          {/* Emergency Quick Access */}
          <View className="mb-8">
            <View className="flex-row flex-wrap justify-between h-fit" style={{ gap: 12 }}>
              {emergencyActions.map((action, index) => (
                <View key={index} className="w-[48%] h-fit">
                  {action.number ? (
                    <TouchableOpacity onPress={() => makeEmergencyCall(action.number)}>
                      <View 
                        className="rounded-xl p-4 h-fit"
                        style={{ backgroundColor: action.color }}
                      >
                        <View className="flex-row items-center mb-3">
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
                        <Text className="text-sm font-light" style={{ color: action.bgColor }}>
                          Call now
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => router.push(action.path)}>
                      <View 
                        className="rounded-xl p-4 h-fit"
                        style={{ backgroundColor: action.color }}
                      >
                        <View className="flex-row justify-between items-center mb-3">
                          <View className="w-full">
                            <Text className="text-base font-semibold text-white">
                              {action.title}
                            </Text>
                            <Text className="text-xs text-gray-50">
                              {action.subtitle}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-sn font-bold" style={{ color: action.bgColor }}>
                          Police Stations
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* SOS Button Section */}
          <View className="mb-8">
            <Text className="text-2xl font-bold mb-5 text-gray-900">Emergency SOS</Text>
            <View className="items-center">
              <TouchableOpacity
                style={[styles.sosButton, isSosPressed && styles.sosButtonActive]}
                className="w-full"
                onPressIn={() => {
                  setIsSosPressed(true);
                  setSosCountdown(3);
                }}
                onPressOut={() => {
                  if (sosCountdown > 0) {
                    setIsSosPressed(false);
                    setSosCountdown(3);
                  }
                }}
                activeOpacity={1}
              >
                <Text style={styles.sosText}>SOS</Text>
                <Text style={styles.sosSubtext}>
                  {isSosPressed 
                    ? `Keep holding for ${sosCountdown}s...` 
                    : 'Hold to activate'}
                </Text>
              </TouchableOpacity>
              {userLocation ? (
                <View className="text-gray-300 text-sm flex flex-row items-center justify-center space-x-3 mt-3 text-center">
                 <Ionicons name='location' size={15} color={'#808080'}/> 
                 <Text className="text-gray-500 ml-2">Your location will be shared</Text>
                </View>
              ) : (
                <Text className="text-gray-500 text-sm mt-3 text-center">
                  Fetching your location...
                </Text>
              )}
            </View>
          </View>

          {/* News Articles Section */}
          {/* <View className="mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-2xl font-bold text-gray-900">Public Notices</Text>
              {loading && <ActivityIndicator size="small" color="#2563eb" />}
            </View>
            
            {error ? (
              <View className="bg-red-50 p-4 rounded-lg">
                <Text className="text-red-600">{error}</Text>
                <TouchableOpacity 
                  onPress={fetchNewsArticles}
                  className="mt-2"
                >
                  <Text className="text-blue-600">Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={newsArticles}
                renderItem={renderNewsItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View className="bg-gray-100 p-6 rounded-lg items-center">
                    <Ionicons name="newspaper-outline" size={32} color="#9ca3af" />
                    <Text className="text-gray-500 mt-2">No news articles found</Text>
                  </View>
                }
              />
            )}
          </View> */}
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  sosButton: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  sosButtonActive: {
    backgroundColor: '#b91c1c',
    transform: [{ scale: 1.05 }],
  },
  sosText: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sosSubtext: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Home;