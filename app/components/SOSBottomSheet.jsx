import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Animated,
  Alert,
  Linking,
  Platform,
  Vibration,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from './Icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmoothBottomSheet from './SmoothBottomSheet';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 60;
const CIRCLE_SIZE = 70;
const TRACK_HEIGHT = 80;

const SOSBottomSheet = ({ visible, onClose, onTriggerSOS }) => {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [slideX] = useState(new Animated.Value(0));
  const [lastSOSTimestamps, setLastSOSTimestamps] = useState([]);
  const [canSendSOS, setCanSendSOS] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const circleScale = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const scrollViewRef = useRef(null);
  const isDragging = useRef(false);
  const slideTriggered = useRef(false);
  const progressRef = useRef(null);
  const pulseAnimationRef = useRef(null);

  // Load SOS history
  useEffect(() => {
    if (visible) {
      loadSOSHistory();
      checkLocationPermission();
      startPulseAnimation();
    } else {
      resetSlider();
      setIsSending(false);
      slideTriggered.current = false;
      isDragging.current = false;
      stopPulseAnimation();
      setProgress(0);
      progressBarWidth.setValue(0);
      if (progressRef.current) {
        clearTimeout(progressRef.current);
      }
    }
  }, [visible]);

  // Countdown timer for rate limiting
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanSendSOS(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const startPulseAnimation = () => {
    pulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimationRef.current.start();
  };

  const stopPulseAnimation = () => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
    }
  };

  const loadSOSHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('sos_history');
      if (history) {
        const timestamps = JSON.parse(history);
        setLastSOSTimestamps(timestamps);
        checkSOSLimit(timestamps);
      }
    } catch (error) {
      console.error('Error loading SOS history:', error);
    }
  };

  const checkSOSLimit = (timestamps) => {
    const now = Date.now();
    const twentyMinutesAgo = now - (20 * 60 * 1000);
    const recentSOS = timestamps.filter(ts => ts > twentyMinutesAgo);
    
    if (recentSOS.length >= 2) {
      setCanSendSOS(false);
      const oldestRecent = Math.min(...recentSOS);
      const timeUntilAvailable = Math.ceil((oldestRecent + (20 * 60 * 1000) - now) / 1000);
      setCountdown(timeUntilAvailable);
    } else {
      setCanSendSOS(true);
      setCountdown(0);
    }
  };

  const updateSOSHistory = async () => {
    try {
      const now = Date.now();
      const updatedTimestamps = [...lastSOSTimestamps, now];
      const limitedTimestamps = updatedTimestamps.slice(-10);
      await AsyncStorage.setItem('sos_history', JSON.stringify(limitedTimestamps));
      setLastSOSTimestamps(limitedTimestamps);
      checkSOSLimit(limitedTimestamps);
    } catch (error) {
      console.error('Error updating SOS history:', error);
    }
  };

  const resetSlider = () => {
    Animated.spring(slideX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsSending(false);
  };

  const startProgressBar = () => {
    setIsSending(true);
    setProgress(0);
    
    // Animate progress bar from 0 to 100% in 3 seconds
    Animated.timing(progressBarWidth, {
      toValue: width - 48, // Full width minus padding
      duration: 3000,
      useNativeDriver: false,
    }).start();
    
    // Update progress percentage
    let progressValue = 0;
    const progressInterval = setInterval(() => {
      progressValue += 3.33; // 100% in 3 seconds (100/30 = 3.33 per 100ms)
      if (progressValue >= 100) {
        progressValue = 100;
        clearInterval(progressInterval);
        sendSOSAlert();
      }
      setProgress(Math.min(progressValue, 100));
    }, 100);
    
    progressRef.current = progressInterval;
  };

  const sendSOSAlert = async () => {
    try {
      // Final vibration before sending
      Vibration.vibrate([0, 100, 100, 200]);

      const permission = await Location.getForegroundPermissionsAsync();
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (permission.status !== 'granted' || !servicesEnabled) {
        resetSlider();
        setIsSending(false);
        setProgress(0);
        progressBarWidth.setValue(0);
        Alert.alert(
          'Location Unavailable',
          'SafeTap cannot attach your location. Enable location access, or contact emergency services directly.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await updateSOSHistory();
      
      if (onTriggerSOS) {
        onTriggerSOS(currentLocation.coords);
      }
      
      // Show success and auto-close after a brief delay
      setTimeout(() => {
        onClose();
        Alert.alert(
          'Emergency SOS Sent',
          'Your location has been sent to emergency services.',
          [{ text: 'OK' }]
        );
      }, 500);
      
    } catch (error) {
      console.error('Error sending SOS:', error);
      resetSlider();
      setProgress(0);
      progressBarWidth.setValue(0);
      Alert.alert('Error', 'Failed to send SOS. Please try again.');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canSendSOS && !isSending,
      onMoveShouldSetPanResponder: () => canSendSOS && !isSending,
      onPanResponderGrant: () => {
        slideTriggered.current = false;
        isDragging.current = true;
        
        // Scale down slightly on touch
        Animated.spring(circleScale, {
          toValue: 0.95,
          useNativeDriver: true,
          friction: 3,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        if (!canSendSOS || isSending) return;
        
        const dx = Math.max(0, Math.min(gestureState.dx, SLIDER_WIDTH - CIRCLE_SIZE));
        slideX.setValue(dx);
        
        // iPhone-like haptic feedback at certain points
        if (dx > (SLIDER_WIDTH - CIRCLE_SIZE) * 0.8 && !slideTriggered.current) {
          Vibration.vibrate(50);
          slideTriggered.current = true;
          startProgressBar();
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        
        // Scale back to normal
        Animated.spring(circleScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 3,
        }).start();
        
        if (slideTriggered.current) {
          // Keep at triggered position
          Animated.spring(slideX, {
            toValue: SLIDER_WIDTH - CIRCLE_SIZE,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
        } else {
          resetSlider();
        }
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        if (!slideTriggered.current) {
          resetSlider();
        }
      },
    })
  ).current;

  const checkLocationPermission = async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      
      if (permission.status !== 'granted') {
        setLocationError('Location permission required');
        Alert.alert(
          'Location Required',
          'This feature requires location access to send your exact location during emergencies.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationError('Device location is turned off');
        Alert.alert(
          'Location Services Off',
          'Turn on device location before sending an SOS. You can close this panel and use emergency calling instead.'
        );
        return;
      }

      await getCurrentLocation();
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationError('Failed to access location');
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
      setLocationError(null);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError('Failed to get location');
    }
  };

  const handleScroll = (event) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  };

  const handleScrollBeginDrag = () => {
    if (scrollOffset.current <= 0) {
      isDragging.current = true;
    }
  };

  const handleScrollEndDrag = (event) => {
    if (scrollOffset.current < -80 && isDragging.current) {
      onClose();
    }
    isDragging.current = false;
  };

  const sliderProgress = slideX.interpolate({
    inputRange: [0, SLIDER_WIDTH - CIRCLE_SIZE],
    outputRange: [0, 1],
  });

  const trackColor = sliderProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#FEE2E2', '#FCA5A5', '#DC2626'],
  });

  const circlePulseScale = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const circlePulseOpacity = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  return (
    <SmoothBottomSheet
      visible={visible}
      onClose={onClose}
      contentStyle={styles.bottomSheet}
    >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEndDrag}
            bounces={true}
            overScrollMode="always"
          >
            {/* Emergency Header - iPhone Style */}
            <View style={styles.emergencyHeader}>
              <View style={styles.emergencyIconContainer}>
                <Ionicons name="alert-circle" size={32} color="#DC2626" />
              </View>
              <Text style={styles.emergencyTitle}>Emergency SOS</Text>
              <Text style={styles.emergencySubtitle}>
                Slide to request SOS
              </Text>
            </View>

            {/* Rate Limit Warning */}
            {!canSendSOS && (
              <View style={styles.rateLimitContainer}>
                <Ionicons name="timer-sand" size={20} color="#DC2626" />
                <Text style={styles.rateLimitText}>
                  Wait {Math.ceil(countdown / 60)} min before next SOS
                </Text>
              </View>
            )}

            {/* Progress Bar */}
            {isSending && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBackground}>
                  <Animated.View 
                    style={[
                      styles.progressBarFill,
                      { width: progressBarWidth }
                    ]}
                  />
                </View>
                <View style={styles.progressTextContainer}>
                  <Text style={styles.progressText}>
                    Sending SOS Alert...
                  </Text>
                  <Text style={styles.progressPercentage}>
                    {Math.round(progress)}%
                  </Text>
                </View>
              </View>
            )}

      

            {/* Map Preview - iPhone Style */}
            <View style={styles.mapContainer}>
              <View style={styles.mapHeader}>
                <Text style={styles.mapTitle}>Your Location</Text>
                <TouchableOpacity onPress={checkLocationPermission}>
                  <Ionicons name="refresh" size={18} color="#1E3A8A" />
                </TouchableOpacity>
              </View>
              {location ? (
                <View>
                   <MapView
                  style={styles.map}
                  region={location}
                  provider={PROVIDER_GOOGLE}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                  showsCompass={false}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                  loadingEnabled={true}
                  loadingIndicatorColor="#DC2626"
                  loadingBackgroundColor="#F3F4F6"
                >
                  <Marker
                    coordinate={{
                      latitude: location.latitude,
                      longitude: location.longitude,
                    }}
                    tracksViewChanges={false}
                  >
                    <View style={styles.mapMarker}>
                      <View style={styles.mapMarkerInner}>
                        <Ionicons name="person" size={12} color="#FFFFFF" />
                      </View>
                    </View>
                  </Marker>
                </MapView>
                      {/* Location Status - Minimal iPhone Style */}
            <View style={styles.locationContainer}>
              <View style={styles.locationIcon}>
                <Ionicons 
                  name={location ? "checkmark-circle" : "location"} 
                  size={20} 
                  color={location ? "#10B981" : "#DC2626"} 
                />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationStatus}>
                  {location ? 'Location Available' : 'Getting Location...'}
                </Text>
                <Text  numberOfLines={1}>
                  {location 
                    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : 'Waiting for GPS...'
                  }
                </Text>
              </View>
            </View>
                </View>
               
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.mapPlaceholderText}>
                    {locationError || 'Loading location...'}
                  </Text>
                </View>
              )}
            </View>

            {/* iPhone-style SOS Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderInstructions}>
                <Text style={styles.sliderInstructionText}>
                  Slide the red SOS button to call emergency services
                </Text>
              </View>
              
              {/* Slider Track */}
              <View style={styles.sliderTrackContainer}>
                <Animated.View 
                  style={[
                    styles.sliderTrackFill,
                    {
                      backgroundColor: trackColor,
                    }
                  ]}
                />
                <Text style={styles.sliderTrackText}>slide to request SOS</Text>
                
                {/* SOS Circle with Pulse Effect */}
                <Animated.View 
                  style={[
                    styles.pulseCircle,
                    {
                      transform: [
                        { scale: circlePulseScale },
                        { translateX: slideX }
                      ],
                      opacity: circlePulseOpacity,
                    }
                  ]}
                />
                
                {/* Main SOS Circle */}
                <Animated.View 
                  {...panResponder.panHandlers}
                  style={[
                    styles.sosCircle,
                    {
                      transform: [
                        { translateX: slideX },
                        { scale: circleScale }
                      ],
                      opacity: canSendSOS ? 1 : 0.5,
                    }
                  ]}
                >
                  {isSending ? (
                    <View style={styles.sendingCircle}>
                      <Ionicons name="checkmark" size={28} color="#FFFFFF" />
                    </View>
                  ) : (
                    <>
                      <View style={styles.sosCircleInner}>
                        <Text style={styles.sosText}>SOS</Text>
                      </View>
                      <Ionicons 
                        name="chevron-forward" 
                        size={24} 
                        color="#FFFFFF" 
                        style={styles.chevronIcon}
                      />
                    </>
                  )}
                </Animated.View>
              </View>
              
              <Text style={styles.sliderHint}>
                {canSendSOS 
                  ? 'Drag right to request'
                  : `Next SOS available in ${Math.ceil(countdown / 60)} minutes`
                }
              </Text>
            </View>

            {/* Emergency Info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoItem}>
                <Ionicons name="call" size={16} color="#6B7280" />
                <Text style={styles.infoText}>
                  Requests emergency services and shares your location
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="time" size={16} color="#6B7280" />
                <Text style={styles.infoText}>
                  Alert sends automatically after 3 seconds
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="shield" size={16} color="#6B7280" />
                <Text style={styles.infoText}>
                  Use only for real emergencies
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Cancel Button - iPhone Style */}
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
    </SmoothBottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  overlayTouchable: {
    flex: 1,
  },
  bottomSheet: {
    height: '90%',
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 30,
  },
  emergencyHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  emergencyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emergencyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  emergencySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  rateLimitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rateLimitText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 3,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  locationInfo: {
    flex: 1,
  },
  locationStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationCoords: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  mapContainer: {
    marginBottom: 20,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  map: {
    height: 160,
    // borderRadius: 14,

    overflow: 'hidden',
  },
  mapMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mapMarkerInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    height: 160,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  sliderSection: {
    marginBottom: 28,
  },
  sliderInstructions: {
    marginBottom: 20,
  },
  sliderInstructionText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  sliderTrackContainer: {
    width: SLIDER_WIDTH,
    height: TRACK_HEIGHT,
    backgroundColor: '#F3F4F6',
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  sliderTrackFill: {
    position: 'absolute',
    left: 0,
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
  sliderTrackText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    zIndex: 1,
  },
  pulseCircle: {
    position: 'absolute',
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#DC2626',
    opacity: 0.3,
  },
  sosCircle: {
    position: 'absolute',
    zIndex: 10,
    left: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  sosCircleInner: {
    width: '100%',
    height: '100%',
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  chevronIcon: {
    position: 'absolute',
    right: 8,
  },
  sendingCircle: {
    width: '100%',
    height: '100%',
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  infoContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
    lineHeight: 20,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E40AF',
  },
});

export default SOSBottomSheet;
