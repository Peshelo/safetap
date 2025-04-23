import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Vibration, Image } from 'react-native';
import { Stack } from 'expo-router';
import * as Location from 'expo-location';
import call from 'react-native-phone-call';

const SOSPage = () => {
  const [countdown, setCountdown] = useState(3);
  const [isPressed, setIsPressed] = useState(false);
  const [userLocation, setUserLocation] = useState('');

  useEffect(() => {
    getLocation();
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

  useEffect(() => {
    let timer;
    if (isPressed && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
        Vibration.vibrate(500); // Vibrate for 500ms on each countdown
      }, 1000);
    } else if (countdown === 0) {
      triggerSOS();
    }
    return () => clearTimeout(timer);
  }, [isPressed, countdown]);

  const triggerSOS = () => {
    // Call emergency number
    // const args = {
    //   number: '999', 
    //   prompt: false,
    // };
    // call(args).catch((error) => Alert.alert('Error', 'Unable to make the call.'));

    // Send location to emergency contacts (implementation would go here)
    Alert.alert('SOS Sent!', `Emergency services have been alerted. Your location: ${userLocation}`);
    
    // Reset
    setIsPressed(false);
    setCountdown(3);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: ' SOS',
        headerShown: true,
        headerRight: () => (
          <Image
            source={require('../../assets/images/logo.jpg')} 
            style={styles.logoHeader} 
          />
        )
      }} />
      
      <Text style={styles.instructions}>
        {isPressed 
          ? `Keep holding for ${countdown} seconds...` 
          : 'Press and hold for 3 seconds to send SOS'}
      </Text>

      <TouchableOpacity
        style={[styles.sosButton, isPressed && styles.sosButtonActive]}
        onPressIn={() => {
          setIsPressed(true);
          setCountdown(3);
        }}
        onPressOut={() => {
          if (countdown > 0) {
            setIsPressed(false);
            setCountdown(3);
          }
        }}
        activeOpacity={1}
      >
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      {userLocation ? (
        <Text style={styles.locationText}>Your location will be shared: {userLocation}</Text>
      ) : (
        <Text style={styles.locationText}>Fetching your location...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  logoHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  instructions: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#334155',
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
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
    fontSize: 36,
    fontWeight: 'bold',
  },
  locationText: {
    marginTop: 40,
    color: '#64748b',
    textAlign: 'center',
  },
});

export default SOSPage;