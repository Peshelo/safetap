import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, Image } from 'react-native';
import { MaterialIcons, FontAwesome, Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const About = () => {
  const [contact, setContact] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Load saved user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const savedInfo = await SecureStore.getItemAsync('userContact');
        if (savedInfo) {
          setContact(savedInfo);
        }
      } catch (error) {
        console.error('Failed to load user contact', error);
      }
    };
    loadUserInfo();
  }, []);

  // const handleInputChange = (field, value) => {
  //   setContact(prev => ({ ...prev, [field]: value }));
  // };

  const saveUserInfo = async () => {
    try {
      await SecureStore.setItemAsync('userContact', contact);
      Alert.alert('Success', 'Your information has been saved securely');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save your information');
      console.error(error);
    }
  };

  const resetUserInfo = async () => {
    Alert.alert(
      'Confirm Reset',
      'Are you sure you want to delete all your personal information?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('userContact');
              setContact(null)
              Alert.alert('Success', 'Your information has been deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete your information');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <StatusBar barStyle={'dark-content'} backgroundColor={'#fff'} />
      
      {/* About Section */}
            <Stack.Screen options={{ 
              title: 'About',
              headerShown: true,
              headerRight: () => (
                <Image
                  source={require('../../assets/images/logo.jpg')} 
                  className="logoHeader" 
                />
              )
            }} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About SafetyTap</Text>
        <Text style={styles.sectionText}>
        SafeTap connects Zimbabweans to the ZRP Police Services for fast emergency reporting and crime prevention.
        </Text>
        <Text style={styles.sectionText}>
          Version 1.0.0 {"\n"}
  
        </Text>
        {/* <Text style={styles.sectionText}>
NB: Data about your Emergency Profile will not be secured stored on your device. It will not be shared with any        </Text> */}
      </View>

      {/* Emergency Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Emergency Profile</Text>
          {!isEditing ? (
            <TouchableOpacity >
              {/* <MaterialIcons name="edit" size={24} color="#3B82F6" /> */}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={saveUserInfo}>
              <Ionicons name="checkmark-done" size={24} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <>
            {/* <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={userInfo.name}
              onChangeText={(text) => handleInputChange('name', text)}
            /> */}
            {/* <TextInput
              style={styles.input}
              placeholder="Blood Type (e.g., O+)"
              value={userInfo.bloodType}
              onChangeText={(text) => handleInputChange('bloodType', text)}
            /> */}
            {/* <TextInput
              style={styles.input}
              placeholder="Allergies"
              value={userInfo.allergies}
              onChangeText={(text) => handleInputChange('allergies', text)}
            /> */}
            <TextInput
              style={styles.input}
              placeholder="Emergency Contact Number (e.g. 0777723454)"
              value={contact}
              onChangeText={(text) => setContact(text)}
              keyboardType="phone-pad"
            />
            {/* <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Medical Conditions"
              value={userInfo.medicalConditions}
              onChangeText={(text) => handleInputChange('medicalConditions', text)}
              multiline
            /> */}
            {/* <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Include in emergency alerts</Text>
              <Switch
                value={userInfo.includeInAlerts}
                onValueChange={(value) => handleInputChange('includeInAlerts', value)}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor="#FFFFFF"
              />
            </View> */}
          </>
        ) : (
          <>
            {contact ? (
              <>
                {/* <InfoRow icon="person" label="Name" value={userInfo.name} /> */}
                {/* <InfoRow icon="bloodtype" label="Blood Type" value={userInfo.bloodType} /> */}
                {/* <InfoRow icon="warning" label="Allergies" value={userInfo.allergies} /> */}
                <InfoRow icon="phone" label="Emergency Contact" value={contact} />
                {/* <InfoRow icon="medical-services" label="Medical Conditions" value={userInfo.medicalConditions} /> */}
                {/* <InfoRow 
                  icon="notifications" 
                  label="Include in alerts" 
                  value={userInfo.includeInAlerts ? 'Yes' : 'No'} 
                /> */}
              </>
            ) : (
              <Text style={styles.emptyText}>No emergency contact set up yet</Text>
            )}
          </>
        )}

        <TouchableOpacity 
          style={contact ? styles.resetButton : styles.addButton} 
          onPress={contact ? resetUserInfo : () => setIsEditing(true)}
        >
          {contact ? (
             <Text style={styles.resetButtonText}>
            {contact ? 'Reset All Information' : 'Clear Storage'}
          </Text>
          ) : (
            <Text style={styles.addButtonText}>
            Add emergency contact
          </Text>
         
          )}
        </TouchableOpacity>
      </View>

      {/* Additional Options */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Options</Text>
        
        <OptionButton 
          icon="history" 
          label="Emergency History" 
          onPress={() => Alert.alert('Coming Soon', 'This feature will show your emergency history')}
        />
        <OptionButton 
          icon="share" 
          label="Share App" 
          onPress={() => Alert.alert('Coming Soon', 'This will let you share the app with others')}
        />
        <OptionButton 
          icon="settings" 
          label="App Settings" 
          onPress={() => Alert.alert('Coming Soon', 'This will open app settings')}
        />
        <OptionButton 
          icon="help" 
          label="Help & Support" 
          onPress={() => Alert.alert('Coming Soon', 'This will open help center')}
        />
        <OptionButton 
          icon="privacy-tip" 
          label="Privacy Policy" 
          onPress={() => Alert.alert('Coming Soon', 'This will show privacy policy')}
        />
      </View> */}
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <MaterialIcons name={icon} size={20} color="#6B7280" />
    </View>
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not specified'}</Text>
    </View>
  </View>
);

const OptionButton = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.optionButton} onPress={onPress}>
    <MaterialIcons name={icon} size={24} color="#3B82F6" />
    <Text style={styles.optionButtonText}>{label}</Text>
    <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',

  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 15,
    color: '#111827',
  },
  resetButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    alignItems: 'center',
  },
  addButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    alignItems: 'center',
  },
    addButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  resetButtonText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
});

export default About;