import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Linking, 
  Alert, 
  ScrollView, 
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  ImageBackground,
  StatusBar,
  Platform
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';

const ContactDetails = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [hasLocationData, setHasLocationData] = useState(false);

  // Check if location data is available
  useEffect(() => {
    const lat = parseFloat(params.latitude);
    const lng = parseFloat(params.longitude);
    const hasValidLocation = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    setHasLocationData(hasValidLocation);
  }, [params.latitude, params.longitude]);

  // Format phone numbers for display
  const formatPhoneNumber = (number) => {
    if (!number) return '';
    const numStr = number.toString();
    // Add + for international numbers
    if (numStr.includes('263') || numStr.startsWith('+')) {
      return numStr.startsWith('+') ? numStr : `+${numStr}`;
    }
    return numStr;
  };

  // Format display text (remove underscores)
  const formatDisplayText = (text) => {
    if (!text) return '';
    return text
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const openWhatsApp = (number) => {
    if (!number) {
      Alert.alert('Error', 'WhatsApp number not available');
      return;
    }
    const formattedNumber = number.toString().startsWith('+') ? number : `+${number}`;
    const url = `https://wa.me/${formattedNumber}`;
    
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const makePhoneCall = (number, label) => {
    if (!number) {
      Alert.alert('Error', `${label} number not available`);
      return;
    }
    
    let url;
    const numStr = number.toString();
    
    if (numStr.includes('263') || numStr.startsWith('+')) {
      url = `tel:+${numStr.replace('+', '')}`;
    } else {
      url = `tel:${numStr}`;
    }
    
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not make phone call'));
  };

  const getDirections = () => {
    const lat = parseFloat(params.latitude);
    const lng = parseFloat(params.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Location data not available for this station');
      return;
    }

    const stationName = formatDisplayText(params.station);
    const encodedName = encodeURIComponent(stationName);
    
    let url;
    if (Platform.OS === 'ios') {
      url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodedName}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_name=${encodedName}&travelmode=driving`;
    }
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open maps app');
    });
  };

  const saveToContacts = async () => {
    try {
      setSavingContact(true);
      
      // Request permissions
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Contacts permission is needed to save this station to your contacts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Create contact object
      const contact = {
        [Contacts.Fields.FirstName]: '',
        [Contacts.Fields.LastName]: formatDisplayText(params.station),
        [Contacts.Fields.Organization]: 'Zimbabwe Republic Police',
        [Contacts.Fields.JobTitle]: 'Police Station',
        [Contacts.Fields.Note]: `Station Information\nProvince: ${formatDisplayText(params.province)}\nDistrict: ${formatDisplayText(params.district)}\n${params.specialty ? `Specialty: ${formatDisplayText(params.specialty)}` : ''}`,
      };

      // Add phone numbers
      const phoneNumbers = [];
      
      if (params.station_number) {
        phoneNumbers.push({
          label: Contacts.Fields.PhoneNumbers.Work,
          number: params.station_number.toString(),
        });
      }
      
      if (params.member_in_charge_number) {
        phoneNumbers.push({
          label: Contacts.Fields.PhoneNumbers.Mobile,
          number: params.member_in_charge_number.toString(),
          isPrimary: true,
        });
      }
      
      if (params.whatsapp_number) {
        phoneNumbers.push({
          label: Contacts.Fields.PhoneNumbers.Other,
          number: params.whatsapp_number.toString(),
        });
      }
      
      if (phoneNumbers.length > 0) {
        contact[Contacts.Fields.PhoneNumbers] = phoneNumbers;
      }

      // Add address if available
      if (params.address) {
        contact[Contacts.Fields.Addresses] = [{
          label: Contacts.Fields.Addresses.Work,
          street: params.address,
          city: formatDisplayText(params.district),
          region: formatDisplayText(params.province),
          country: 'Zimbabwe',
        }];
      }

      // Add URL for ZRP
      contact[Contacts.Fields.UrlAddresses] = [{
        label: Contacts.Fields.UrlAddresses.HomePage,
        url: 'https://www.zrp.gov.zw',
      }];

      // Create the contact
      const contactId = await Contacts.addContactAsync(contact);
      
      Alert.alert(
        'Success',
        `${formatDisplayText(params.station)} has been added to your contacts.`,
        [
          { 
            text: 'View Contact', 
            onPress: () => {
              Contacts.presentFormAsync(contactId);
            }
          },
          { text: 'OK' }
        ]
      );
      
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    } finally {
      setSavingContact(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!reportText.trim()) {
      Alert.alert('Error', 'Please provide details about the incorrect information');
      return;
    }

    setSubmittingReport(true);
    try {
      const reportData = {
        station_id: params.id,
        station_name: params.station,
        category: reportCategory,
        details: reportText,
        timestamp: new Date().toISOString(),
        location_available: hasLocationData,
        latitude: params.latitude,
        longitude: params.longitude,
      };

      console.log('Report submitted:', reportData);
      
      // In a real app, you would send this to your backend
      // For now, we'll simulate a successful submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Thank You!',
        'Your report has been submitted. We will review the information and make corrections if needed.',
        [
          {
            text: 'OK',
            onPress: () => {
              setReportModalVisible(false);
              setReportText('');
              setReportCategory('');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Contact info sections - Reordered for better flow
  const contactSections = [
    {
      title: 'Station Information',
      items: [
        { label: 'Station Name', value: formatDisplayText(params.station) },
        { label: 'Province', value: formatDisplayText(params.province) },
        { label: 'District', value: formatDisplayText(params.district) },
        params.specialty && { label: 'Specialty', value: formatDisplayText(params.specialty) },
        params.address && { label: 'Address', value: formatDisplayText(params.address) },
      ].filter(Boolean),
    },
    {
      title: 'Contact Numbers',
      items: [
        params.station_number && { 
          label: 'Station Number', 
          value: formatPhoneNumber(params.station_number),
          type: 'phone',
          action: () => makePhoneCall(params.station_number, 'Station'),
          icon: 'phone-alt',
          color: '#1E3A8A'
        },
        params.member_in_charge_number && { 
          label: 'Officer in Charge', 
          value: `${formatDisplayText(params.member_in_charge || '')} - ${formatPhoneNumber(params.member_in_charge_number)}`,
          type: 'phone',
          action: () => makePhoneCall(params.member_in_charge_number, 'Officer'),
          icon: 'user-shield',
          color: '#059669'
        },
        params.whatsapp_number && { 
          label: 'WhatsApp', 
          value: formatPhoneNumber(params.whatsapp_number),
          type: 'whatsapp',
          action: () => openWhatsApp(params.whatsapp_number),
          icon: 'whatsapp',
          color: '#25D366'
        },
      ].filter(Boolean),
    },
  ];

  const reportCategories = [
    { id: 'wrong_number', label: 'Wrong Phone Number', icon: 'phone' },
    { id: 'wrong_name', label: 'Wrong Station Name', icon: 'building' },
    { id: 'wrong_location', label: 'Wrong Location', icon: 'map-marker' },
    { id: 'wrong_officer', label: 'Wrong Officer Info', icon: 'user' },
    { id: 'station_closed', label: 'Station Closed', icon: 'door-closed' },
    { id: 'other', label: 'Other Issue', icon: 'exclamation-circle' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Simple Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Station Details</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {formatDisplayText(params.station)}
          </Text>
        </View>
        {/* <TouchableOpacity 
          style={styles.saveButton}
          onPress={saveToContacts}
          disabled={savingContact}
        >
          {savingContact ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            // <Ionicons name="person-add" size={20} color="#FFFFFF" />
            <></>
          )}
        </TouchableOpacity> */}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section with Background */}
        <View style={styles.heroContainer}>
          <ImageBackground
            source={require('../assets/images/fallback.png')}
            style={styles.heroSection}
            imageStyle={styles.heroBackground}
          >
            <View style={styles.heroOverlay}>
              <View style={styles.heroContent}>
                <View style={styles.stationLogo}>
                  <Image
                    source={require('../assets/images/logo-alternate.png')}
                    style={styles.logoImage}
                  />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName} numberOfLines={2}>
                    {formatDisplayText(params.station)}
                  </Text>
                  <Text style={styles.stationLocation}>
                    {formatDisplayText(params.district)}, {formatDisplayText(params.province)}
                  </Text>
                  
                  {/* Location Status */}
                  {hasLocationData && (
                    <View style={styles.locationStatus}>
                      <Ionicons name="location" size={12} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.locationText}>Location data available</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <Text style={styles.heroTagline}>
                Zimbabwe Republic Police • Always Ready to Serve
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {/* <Text style={styles.sectionTitle}>Quick Actions</Text> */}
          <View style={styles.quickActions}>
            {params.station_number && (
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => makePhoneCall(params.station_number, 'Station')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <FontAwesome5 name="phone-alt" size={20} color="#1E3A8A" />
                </View>
                <Text style={styles.quickActionText}>Call Station</Text>
              </TouchableOpacity>
            )}
            
            {params.member_in_charge_number && (
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => makePhoneCall(params.member_in_charge_number, 'Officer')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#DCFCE7' }]}>
                  <FontAwesome5 name="user-shield" size={20} color="#059669" />
                </View>
                <Text style={styles.quickActionText}>Call OIC</Text>
              </TouchableOpacity>
            )}
            
            {hasLocationData && (
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={getDirections}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#FEF3C7' }]}>
                  <FontAwesome5 name="directions" size={20} color="#D97706" />
                </View>
                <Text style={styles.quickActionText}>Directions</Text>
              </TouchableOpacity>
            )}
            
            {params.whatsapp_number && (
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => openWhatsApp(params.whatsapp_number)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#DCFCE7' }]}>
                  <FontAwesome5 name="whatsapp" size={20} color="#25D366" />
                </View>
                <Text style={styles.quickActionText}>WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#1E3A8A' }]}
            onPress={saveToContacts}
            disabled={savingContact}
          >
            {savingContact ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="person-add" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Add to Contacts</Text>
              </>
            )}
          </TouchableOpacity>
          
          {hasLocationData && (
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#059669' }]}
              onPress={getDirections}
            >
              <FontAwesome5 name="directions" size={18} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Get Directions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contact Details */}
        <View style={styles.detailsContainer}>
          {contactSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCard}>
                {section.items.map((item, itemIndex) => (
                  <View 
                    key={itemIndex}
                    style={[
                      styles.detailItem,
                      itemIndex < section.items.length - 1 && styles.detailItemBorder
                    ]}
                  >
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <View style={styles.detailValueRow}>
                      <Text style={styles.detailValue}>{item.value}</Text>
                      {item.type && (
                        <TouchableOpacity 
                          onPress={item.action}
                          style={styles.detailActionButton}
                        >
                          <FontAwesome5 
                            name={item.icon} 
                            size={18} 
                            color={item.color || '#1E3A8A'} 
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Location Information Section */}
          {hasLocationData && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <View style={styles.sectionCard}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Coordinates</Text>
                  <Text style={styles.detailValue}>
                    {parseFloat(params.latitude).toFixed(6)}, {parseFloat(params.longitude).toFixed(6)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.locationButton}
                  onPress={getDirections}
                >
                  <View style={styles.locationButtonContent}>
                    <View style={styles.locationIcon}>
                      <FontAwesome5 name="directions" size={20} color="#059669" />
                    </View>
                    <View style={styles.locationTextContainer}>
                      <Text style={styles.locationButtonTitle}>Open in Maps</Text>
                      <Text style={styles.locationButtonSubtitle}>Get turn-by-turn directions</Text>
                    </View>
                    <Ionicons name="open-outline" size={20} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Emergency Notice */}
        <View style={styles.noticeContainer}>
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={styles.noticeTitle}>Important Notice</Text>
            </View>
            <Text style={styles.noticeText}>
              Do not abuse this information by making spam calls. Misuse of emergency contacts may lead to legal action.
            </Text>
          </View>
        </View>

        {/* Report Button */}
        <View style={styles.reportButtonContainer}>
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => setReportModalVisible(true)}
          >
            <View style={styles.reportButtonContent}>
              <View style={styles.reportIcon}>
                <MaterialIcons name="report" size={24} color="#DC2626" />
              </View>
              <View style={styles.reportTextContainer}>
                <Text style={styles.reportTitle}>Report Incorrect Information</Text>
                <Text style={styles.reportSubtitle}>Help us keep information accurate</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Issue</Text>
              <TouchableOpacity 
                onPress={() => setReportModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>
                Please let us know what information is incorrect for{' '}
                <Text style={styles.modalStationName}>{formatDisplayText(params.station)}</Text>
              </Text>

              {/* Category Selection */}
              <Text style={styles.modalSectionTitle}>What's wrong?</Text>
              <View style={styles.categoryGrid}>
                {reportCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      reportCategory === category.id && styles.categoryButtonActive
                    ]}
                    onPress={() => setReportCategory(category.id)}
                  >
                    <FontAwesome5 
                      name={category.icon} 
                      size={16} 
                      color={reportCategory === category.id ? '#DC2626' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.categoryText,
                      reportCategory === category.id && styles.categoryTextActive
                    ]}>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Details Input */}
              <Text style={styles.modalSectionTitle}>Details</Text>
              <TextInput
                style={styles.reportInput}
                placeholder="Please provide specific details about what's incorrect and what the correct information should be..."
                placeholderTextColor="#9CA3AF"
                value={reportText}
                onChangeText={setReportText}
                multiline={true}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submittingReport || !reportCategory || !reportText.trim()) && styles.submitButtonDisabled
                ]}
                onPress={handleReportSubmit}
                disabled={submittingReport || !reportCategory || !reportText.trim()}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Ionicons name="send" size={18} color="white" />
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.modalFooter}>
                Your report will be reviewed within 24 hours
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 2,
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroContainer: {
    paddingHorizontal: 0,
    marginTop: 0,
  },
  heroSection: {
    height: 150,
    justifyContent: 'flex-end',
  },
  heroBackground: {
    opacity: 0.6,
    resizeMode: 'cover',
  },
  heroOverlay: {
    backgroundColor: 'rgba(30, 58, 138, 0.65)',
    padding: 20,
    paddingTop: 30,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stationLogo: {
    marginRight: 16,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  stationLocation: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 4,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  heroTagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
    
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailItem: {
    paddingVertical: 12,
  },
  detailItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    lineHeight: 22,
  },
  detailActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  locationButton: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 2,
  },
  locationButtonSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  noticeContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  noticeCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 10,
  },
  noticeText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  reportButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  reportButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reportTextContainer: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  reportSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScroll: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalStationName: {
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  categoryText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
  },
  categoryTextActive: {
    color: '#DC2626',
    fontWeight: '500',
  },
  reportInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 24,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalFooter: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
};

export default ContactDetails;