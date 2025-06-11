import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from 'expo-secure-store';
import pb from "../../lib/connection";
import { router, Stack, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const priorities = [
  { label: "Low", value: "green" },
  { label: "Medium", value: "yellow" },
  { label: "High", value: "red" },
];

const Case = () => {
  const params = useLocalSearchParams();
  const [formData, setFormData] = useState({
    description: "",
    phone_number: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [location, setLocation] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [caseId, setCaseId] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const requestPermissions = async () => {
      // Request location permission
      let { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
      } else {
        const userLocation = await Location.getCurrentPositionAsync({});
        setLocation(userLocation.coords);
      }

      // Request camera/media permissions
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (mediaStatus !== 'granted' || cameraStatus !== 'granted') {
        Alert.alert("Permission Denied", "We need permissions to access your camera and photos.");
      }
    };

    requestPermissions();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.phone_number) newErrors.phone_number = "Phone number is required";
    if (!formData.description) newErrors.description = "Description is required";
    return newErrors;
  };

  const handleImageAction = async (useCamera = false) => {
    let result;
    
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    }

    if (!result.canceled && result.assets?.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmitReport = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("title", params?.case);
      data.append("phoneNumber", formData.phone_number);
      data.append("description", formData.description);
      data.append("merchant", "oi2mnpx4rc6i655"); // Default merchant
      data.append("status", "Open");
      data.append("priority", "red");
      
      if (location) {
        data.append("latitude", location.latitude.toString());
        data.append("longitude", location.longitude.toString());
      }

      if (imageUri) {
        const fileName = imageUri.split("/").pop();
        const fileType = fileName.split(".").pop();
        data.append("images", {
          uri: imageUri,
          name: fileName,
          type: `image/${fileType}`,
        });
      }

      const record = await pb.collection("cases").create(data);
      setCaseId(record.id);
      setSuccess(true);
  
      const existingCases = await AsyncStorage.getItem("cases");
      const mycases = existingCases ? JSON.parse(existingCases) : [];
      mycases.push(record);
      await AsyncStorage.setItem("cases", JSON.stringify(mycases));
      resetForm();
            Alert.alert("Success", "Your case has been submitted successfully.");
      
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to submit the case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      description: "",
      phone_number: "",
    });
    setImageUri(null);
    setErrors({});
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(caseId);
    Alert.alert("Copied!", "Case ID has been copied to your clipboard.");
    router.replace("/(tabs)/trackcase");
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Stack.Screen options={{ title: "Report Submitted" }} />
        <View style={styles.successCard}>
          <View style={styles.successHeader}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-done" size={32} color="#22c55e" />
            </View>
            <Text style={styles.successTitle}>Report Submitted!</Text>
            <Text style={styles.successSubtitle}>Your case has been successfully submitted</Text>
          </View>

          <View style={styles.caseIdContainer}>
            <Text style={styles.caseIdLabel}>Case ID</Text>
            <Text style={styles.caseIdText}>{caseId}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.button, styles.copyButton]}
            onPress={copyToClipboard}
          >
            <Text style={styles.buttonText}>Copy Case ID</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.successButton]}
            onPress={() => setSuccess(false)}
          >
            <Text style={styles.buttonText}>Submit Another Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ 
        title: `Report ${params?.case}`,
        headerTitleStyle: styles.headerTitle
      }} />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Details</Text>
        
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={[styles.input, errors.phone_number && styles.inputError]}
            placeholder="Enter your phone number..."
            value={formData.phone_number}
            onChangeText={(text) => handleInputChange('phone_number', text)}
            keyboardType="phone-pad"
          />
          {errors.phone_number && (
            <Text style={styles.errorText}>{errors.phone_number}</Text>
          )}
        </View>
      
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[
              styles.textArea, 
              errors.description && styles.inputError
            ]}
            placeholder="Describe the emergency in detail..."
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(text) => handleInputChange('description', text)}
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description}</Text>
          )}
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Attach Photo (Optional)</Text>
          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={() => handleImageAction(false)}
            >
              <FontAwesome5 name="image" size={20} color="#64748b" />
              <Text style={styles.imageButtonText}>Choose Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={() => handleImageAction(true)}
            >
              <FontAwesome5 name="camera" size={20} color="#64748b" />
              <Text style={styles.imageButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          
          {imageUri && (
            <Image 
              source={{ uri: imageUri }} 
              style={styles.previewImage} 
              resizeMode="cover"
            />
          )}
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <FontAwesome5 name="paper-plane" size={16} color="white" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    padding: 20,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  inputCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
  },
  imageButtonText: {
    color: '#64748b',
    marginLeft: 8,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 3,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconContainer: {
    backgroundColor: '#dcfce7',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 8,
  },
  successSubtitle: {
    color: '#64748b',
    textAlign: 'center',
  },
  caseIdContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  caseIdLabel: {
    color: '#64748b',
    marginBottom: 4,
  },
  caseIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
  },
  button: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: '#2563eb',
  },
  successButton: {
    backgroundColor: '#22c55e',
    marginBottom: 0,
  },
});

export default Case;