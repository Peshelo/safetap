import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Linking, 
  Alert, 
  ScrollView, 
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import CustomHeader from './components/Header';

const ContactDetails = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportCategory, setReportCategory] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [contactAdded, setContactAdded] = useState(false);

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

  const saveToContacts = () => {
    // This is a simplified version - in a real app, you'd use a contacts library
    Alert.alert(
      'Save to Contacts',
      'Would you like to save this contact to your phone?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: () => {
            setContactAdded(true);
            Alert.alert('Success', 'Contact saved (simulated action)');
          }
        }
      ]
    );
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
      // In a real app, send this to your backend
      const reportData = {
        station_id: params.id,
        station_name: params.station,
        category: reportCategory,
        details: reportText,
        timestamp: new Date().toISOString(),
      };

      console.log('Report submitted:', reportData);
      
      // Simulate API call
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

  // Contact info sections
  const contactSections = [
    {
      title: 'Station Information',
      items: [
        { label: 'Station Name', value: formatDisplayText(params.station) },
        { label: 'Province', value: formatDisplayText(params.province) },
        { label: 'District', value: formatDisplayText(params.district) },
        params.specialty && { label: 'Specialty', value: formatDisplayText(params.specialty) },
      ].filter(Boolean),
    },
    {
      title: 'Contact Numbers',
      items: [
        params.station_number && { 
          label: 'Station Number', 
          value: formatPhoneNumber(params.station_number),
          type: 'phone',
          action: () => makePhoneCall(params.station_number, 'Station')
        },
        params.member_in_charge_number && { 
          label: 'Officer in Charge', 
          value: `${formatDisplayText(params.member_in_charge)} - ${formatPhoneNumber(params.member_in_charge_number)}`,
          type: 'phone',
          action: () => makePhoneCall(params.member_in_charge_number, 'Officer')
        },
        params.whatsapp_number && { 
          label: 'WhatsApp', 
          value: formatPhoneNumber(params.whatsapp_number),
          type: 'whatsapp',
          action: () => openWhatsApp(params.whatsapp_number)
        },
      ].filter(Boolean),
    },
  ];

  const reportCategories = [
    { id: 'wrong_number', label: 'Wrong Phone Number' },
    { id: 'wrong_name', label: 'Wrong Station Name' },
    { id: 'wrong_location', label: 'Wrong Location' },
    { id: 'wrong_officer', label: 'Wrong Officer Info' },
    { id: 'station_closed', label: 'Station Closed' },
    { id: 'other', label: 'Other Issue' },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen options={{ headerShown: false }} />
      
      <CustomHeader
        title="Station Details"
        subtitle={formatDisplayText(params.station)}
        showBackButton={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="bg-blue-600 px-5 pt-6 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white mb-1">
                {formatDisplayText(params.station)}
              </Text>
              <Text className="text-blue-100">
                {formatDisplayText(params.district)}, {formatDisplayText(params.province)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={saveToContacts}
              className={`w-12 h-12 rounded-full items-center justify-center ${contactAdded ? 'bg-green-100' : 'bg-white/20'}`}
            >
              <Ionicons 
                name={contactAdded ? "checkmark" : "person-add"} 
                size={24} 
                color={contactAdded ? "#10B981" : "white"} 
              />
            </TouchableOpacity>
          </View>
          
          <Text className="text-blue-100 text-sm">
            Zimbabwe Republic Police • Always Ready to Serve
          </Text>
        </View>

        {/* Quick Actions */}
        <View className="px-5 -mt-4">
          <View className="bg-white rounded-xl shadow-lg p-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</Text>
            <View className="flex-row justify-between">
              {params.station_number && (
                <TouchableOpacity 
                  className="flex-1 items-center py-3 bg-blue-50 rounded-lg mx-1"
                  onPress={() => makePhoneCall(params.station_number, 'Station')}
                >
                  <FontAwesome5 name="phone-alt" size={20} color="#1E40AF" />
                  <Text className="text-blue-700 font-semibold mt-2">Call Station</Text>
                </TouchableOpacity>
              )}
              
              {params.member_in_charge_number && (
                <TouchableOpacity 
                  className="flex-1 items-center py-3 bg-indigo-50 rounded-lg mx-1"
                  onPress={() => makePhoneCall(params.member_in_charge_number, 'Officer')}
                >
                  <FontAwesome5 name="user-shield" size={20} color="#4F46E5" />
                  <Text className="text-indigo-700 font-semibold mt-2">Call OIC</Text>
                </TouchableOpacity>
              )}
              
              {params.whatsapp_number && (
                <TouchableOpacity 
                  className="flex-1 items-center py-3 bg-green-50 rounded-lg mx-1"
                  onPress={() => openWhatsApp(params.whatsapp_number)}
                >
                  <FontAwesome5 name="whatsapp" size={20} color="#059669" />
                  <Text className="text-green-700 font-semibold mt-2">WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Contact Details */}
        <View className="px-5 mt-6">
          {contactSections.map((section, sectionIndex) => (
            <View key={sectionIndex} className="mb-6">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                {section.title}
              </Text>
              <View className="bg-white rounded-xl shadow-sm p-4">
                {section.items.map((item, itemIndex) => (
                  <View 
                    key={itemIndex}
                    className={`py-3 ${itemIndex < section.items.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <Text className="text-sm text-gray-500 mb-1">{item.label}</Text>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base text-gray-900 font-medium flex-1">
                        {item.value}
                      </Text>
                      {item.type && (
                        <TouchableOpacity 
                          onPress={item.action}
                          className="ml-2 p-2"
                        >
                          {item.type === 'whatsapp' ? (
                            <FontAwesome5 name="whatsapp" size={18} color="#059669" />
                          ) : (
                            <FontAwesome5 name="phone" size={18} color="#3B82F6" />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Emergency Note */}
        <View className="px-5 mt-4 mb-6">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4">
            <View className="flex-row items-start">
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <View className="ml-3 flex-1">
                <Text className="font-semibold text-red-700 mb-1">Emergency Notice</Text>
                <Text className="text-red-600 text-sm">
                  Do not abuse this information by doing spam calls as you may face legal action.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Report Button */}
        <View className="px-5 mb-8">
          <TouchableOpacity 
            className="bg-white border border-gray-300 rounded-xl p-4 flex-row items-center justify-between"
            onPress={() => setReportModalVisible(true)}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-yellow-50 items-center justify-center mr-3">
                <MaterialIcons name="report" size={20} color="#D97706" />
              </View>
              <View>
                <Text className="font-semibold text-gray-900">Report Incorrect Information</Text>
                <Text className="text-gray-500 text-sm">Help us keep information accurate</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-4/5">
            {/* Header */}
            <View className="flex-row items-center justify-between p-6 border-b border-gray-200">
              <Text className="text-xl font-bold text-gray-900">Report Issue</Text>
              <TouchableOpacity 
                onPress={() => setReportModalVisible(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-6" showsVerticalScrollIndicator={false}>
              <Text className="text-gray-600 mb-6">
                Please let us know what information is incorrect for <Text className="font-semibold">{formatDisplayText(params.station)}</Text>
              </Text>

              {/* Category Selection */}
              <Text className="font-medium text-gray-900 mb-3">What's wrong?</Text>
              <View className="flex-row flex-wrap mb-6">
                {reportCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    className={`px-4 py-2 rounded-full mr-2 mb-2 border ${
                      reportCategory === category.id 
                        ? 'bg-red-50 border-red-300' 
                        : 'bg-gray-50 border-gray-300'
                    }`}
                    onPress={() => setReportCategory(category.id)}
                  >
                    <Text className={
                      reportCategory === category.id 
                        ? 'text-red-700 font-medium' 
                        : 'text-gray-700'
                    }>
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Details Input */}
              <Text className="font-medium text-gray-900 mb-3">Details</Text>
              <TextInput
                className="bg-gray-50 border border-gray-300 rounded-xl p-4 text-gray-900 h-40 text-align-top"
                placeholder="Please provide specific details about what's incorrect and what the correct information should be..."
                placeholderTextColor="#9CA3AF"
                value={reportText}
                onChangeText={setReportText}
                multiline={true}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                className={`mt-6 py-4 rounded-xl items-center justify-center ${
                  submittingReport || !reportCategory || !reportText.trim()
                    ? 'bg-gray-300'
                    : 'bg-red-600'
                }`}
                onPress={handleReportSubmit}
                disabled={submittingReport || !reportCategory || !reportText.trim()}
              >
                {submittingReport ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="send" size={18} color="white" />
                    <Text className="text-white font-semibold text-base ml-2">
                      Submit Report
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <Text className="text-gray-500 text-sm text-center mt-4">
                Your report will be reviewed within 24 hours
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ContactDetails;