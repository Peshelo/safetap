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
  StatusBar,
  Linking,
} from "react-native";
import { Ionicons } from "../components/Icons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from 'expo-secure-store';
import api from "../../lib/connection";
import { router, Stack, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const priorities = [
  { label: "Low", value: "green" },
  { label: "Medium", value: "yellow" },
  { label: "High", value: "red" },
];

const Case = () => {
  const insets = useSafeAreaInsets();
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
  const [userPhoneNumber, setUserPhoneNumber] = useState("");

  // Load user's emergency contact phone number
  useEffect(() => {
    const loadUserPhoneNumber = async () => {
      try {
        const savedInfo = await SecureStore.getItemAsync("userEmergencyInfo");
        if (savedInfo) {
          const parsedInfo = JSON.parse(savedInfo);
          if (parsedInfo.emergencyContact) {
            setUserPhoneNumber(parsedInfo.emergencyContact);
            setFormData(prev => ({ ...prev, phone_number: parsedInfo.emergencyContact }));
          }
        }
      } catch (error) {
        console.error("Failed to load user phone number", error);
      }
    };

    loadUserPhoneNumber();
  }, []);

  useEffect(() => {
    const loadOptionalLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") return;
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) return;
        const userLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(userLocation.coords);
      } catch (error) {
        console.warn("Optional report location unavailable", error);
      }
    };

    loadOptionalLocation();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.phone_number.trim()) newErrors.phone_number = "Phone number is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    return newErrors;
  };

  const handleImageAction = async (useCamera = false) => {
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          useCamera ? "Camera Access Off" : "Photo Access Off",
          `You can submit the report without a photo. To attach one, allow ${useCamera ? "camera" : "photo library"} access.`,
          [
            { text: "Continue Without Photo", style: "cancel" },
            ...(!permission.canAskAgain ? [{ text: "Open Settings", onPress: () => Linking.openSettings() }] : []),
          ]
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })
        : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error", error);
      Alert.alert("Photo Unavailable", "The photo could not be opened. You can continue without attaching one.");
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
      data.append("title", params?.case || "Emergency Report");
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

      const record = await api.collection("cases").create(data);
      setCaseId(record.id);
      setSuccess(true);
  
      // Save to local storage
      const existingCases = await AsyncStorage.getItem("cases");
      const mycases = existingCases ? JSON.parse(existingCases) : [];
      mycases.push(record);
      await AsyncStorage.setItem("cases", JSON.stringify(mycases));
      resetForm();
      
      Alert.alert("Success", "Your emergency report has been submitted successfully.");
      
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
      phone_number: userPhoneNumber || "", // Keep the loaded phone number
    });
    setImageUri(null);
    setErrors({});
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(caseId);
    Alert.alert("Copied!", "Case ID has been copied to your clipboard.");
    router.replace("/(tabs)/services");
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePhoneNumberUpdate = () => {
    Alert.alert(
      "Update Phone Number",
      "To update your phone number, please go to Settings and update your emergency contact information.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Go to Settings", 
          onPress: () => router.push("/(tabs)/about")
        }
      ]
    );
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { paddingBottom: insets.bottom }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Report Submitted
            </Text>
            <Text style={styles.headerSubtitle}>
              Zimbabwe Republic Police
            </Text>
          </View>
        </View>

        <View style={styles.successCard}>
          <View style={styles.successHeader}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Report Submitted!</Text>
            <Text style={styles.successSubtitle}>
              Your emergency report has been successfully submitted
            </Text>
            <Text style={styles.successMessage}>
              Our emergency response team has been notified.
            </Text>
          </View>

          <View style={styles.caseIdContainer}>
            <View style={styles.caseIdHeader}>
              <Ionicons name="file-alt" size={16} color="#6B7280" />
              <Text style={styles.caseIdLabel}>Case ID</Text>
            </View>
            <Text style={styles.caseIdText}>{caseId}</Text>
          </View>

          <View style={styles.successButtons}>
            <TouchableOpacity 
              style={[styles.button, styles.primaryButton]}
              onPress={copyToClipboard}
            >
              <Ionicons name="copy" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Copy Case ID</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setSuccess(false)}
            >
              <Ionicons name="plus" size={16} color="#1E3A8A" />
              <Text style={styles.secondaryButtonText}>Submit Another Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {params?.case ? `Report ${params.case}` : "Emergency Report"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Zimbabwe Republic Police
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Phone Number Info */}
        {userPhoneNumber && (
          <View style={styles.phoneInfoSection}>
            <View style={styles.phoneInfoHeader}>
              <View style={styles.phoneIconContainer}>
                <Ionicons name="phone-portrait" size={20} color="#1E3A8A" />
              </View>
              <View style={styles.phoneInfoContent}>
                <Text style={styles.phoneInfoLabel}>Your Contact Number</Text>
                <Text style={styles.phoneInfoValue}>{userPhoneNumber}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.updatePhoneButton}
              onPress={handlePhoneNumberUpdate}
            >
              <Text style={styles.updatePhoneText}>Update</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Emergency Details Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Emergency Details</Text>
          <View style={styles.formCard}>
            
            {/* Phone Number Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.phone_number && styles.inputError,
                ]}
                placeholder="Enter your phone number..."
                placeholderTextColor="#9CA3AF"
                value={formData.phone_number}
                onChangeText={(text) => handleInputChange('phone_number', text)}
                keyboardType="phone-pad"
              />
              {errors.phone_number && (
                <Text style={styles.errorText}>{errors.phone_number}</Text>
              )}
            </View>

            {/* Description Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  errors.description && styles.inputError,
                ]}
                placeholder="Describe the emergency in detail..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={formData.description}
                onChangeText={(text) => handleInputChange('description', text)}
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            {/* Photo Upload */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Attach Photo (Optional)</Text>
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={() => handleImageAction(false)}
                >
                  <Ionicons name="image" size={18} color="#6B7280" />
                  <Text style={styles.imageButtonText}>Choose Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.imageButton}
                  onPress={() => handleImageAction(true)}
                >
                  <Ionicons name="camera" size={18} color="#6B7280" />
                  <Text style={styles.imageButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
              
              {imageUri && (
                <View style={styles.previewContainer}>
                  <Image 
                    source={{ uri: imageUri }} 
                    style={styles.previewImage} 
                    resizeMode="cover"
                  />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Ionicons name="alert-circle" size={16} color="#6B7280" />
              <Text style={styles.noteText}>
                * Required fields. Location data is automatically collected for emergency response.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitReport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="paper-plane"
                    size={16}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.submitButtonText}>Submit Emergency Report</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Spacing */}
        <View style={styles.footerSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  // Header Styles
  header: {
    backgroundColor: "#1E3A8A",
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingBottom: 20,
  },
  // Phone Info Section
  phoneInfoSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  phoneInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  phoneIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  phoneInfoContent: {
    flex: 1,
  },
  phoneInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  phoneInfoValue: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  updatePhoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    marginLeft: 12,
  },
  updatePhoneText: {
    fontSize: 12,
    color: "#1E3A8A",
    fontWeight: "500",
  },
  // Form Section
  formSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 16,
    color: "#111827",
  },
  textArea: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 16,
    color: "#111827",
    minHeight: 120,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  imageButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  previewContainer: {
    position: "relative",
    marginTop: 8,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    marginTop: 4,
  },
  noteText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Success Screen Styles
  successContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  successCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#059669",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  caseIdContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  caseIdHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  caseIdLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  caseIdText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#059669",
    textAlign: "center",
  },
  successButtons: {
    width: "100%",
    maxWidth: 400,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: "#1E3A8A",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: "#1E3A8A",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  footerSpacing: {
    height: 20,
  },
});

export default Case;
