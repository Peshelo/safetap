import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import pb from "../../../lib/connection";

const commentTypes = [
  { label: "Comment", value: "COMMENT" },
  { label: "Complaint", value: "COMPLAINT" },
  { label: "Suggestion", value: "SUGGESTION" },
  { label: "Other", value: "OTHER" },
];

const Case = () => {
  const params = useLocalSearchParams();
  const [message, setMessage] = useState("");
  const [commentType, setCommentType] = useState("COMMENT");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
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
          }
        }
      } catch (error) {
        console.error("Failed to load user phone number", error);
      }
    };
    loadUserPhoneNumber();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!message.trim()) newErrors.message = "Message is required";
    return newErrors;
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const data = {
        comment: message,
        flag: commentType,
        case: params.case || "general",
        user_phone: userPhoneNumber || null, // Include user's phone number if available
        timestamp: new Date().toISOString(),
        status: "pending",
      };

      await pb.collection("comments").create(data);
      setSuccess(true);
      resetForm();
      Alert.alert(
        "Success",
        `Your ${commentType.toLowerCase()} has been submitted successfully!`
      );
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage("");
    setCommentType("COMMENT");
    setErrors({});
  };

  const handlePhoneNumberUpdate = async () => {
    Alert.alert(
      "Update Phone Number",
      "To update your phone number, please go to Settings and update your emergency contact information.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Go to Settings", 
          onPress: () => router.push("/about")
        }
      ]
    );
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {params?.case ? `Report ${params.case}` : "Feedback Submitted"}
            </Text>
            <Text style={styles.headerSubtitle}>
              Zimbabwe Republic Police
            </Text>
          </View>
        </View>

        <View style={styles.successCard}>
          <View style={styles.successHeader}>
            <View style={styles.successIconContainer}>
              <FontAwesome5 name="check-circle" size={48} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successSubtitle}>
              Your {commentType.toLowerCase()} has been submitted
            </Text>
            <Text style={styles.successMessage}>
              We appreciate your feedback and will review it shortly.
            </Text>
          </View>

          <View style={styles.successButtons}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setSuccess(false)}
            >
              <FontAwesome5 name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Submit Another</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.replace("/(tabs)/services")}
            >
              <FontAwesome5 name="home" size={16} color="#1E3A8A" />
              <Text style={styles.secondaryButtonText}>Go to Services</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {params?.case ? `Report ${params.case}` : "Submit Feedback"}
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
              <Text style={styles.updatePhoneText}>Update Number</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Feedback Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Feedback Details</Text>
          <View style={styles.formCard}>
            
            {/* Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Feedback Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={commentType}
                  onValueChange={(itemValue) => {
                    setCommentType(itemValue);
                    setErrors({});
                  }}
                  dropdownIconColor="#6B7280"
                  style={styles.picker}
                >
                  {commentTypes.map((type) => (
                    <Picker.Item
                      key={type.value}
                      label={type.label}
                      value={type.value}
                      color="#111827"
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Message Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Your Message</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.message && styles.inputError,
                ]}
                placeholder={`Enter your ${commentType.toLowerCase()} here...`}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  if (errors.message) setErrors({});
                }}
              />
              {errors.message && (
                <Text style={styles.errorText}>{errors.message}</Text>
              )}
            </View>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.noteText}>
                Note: Your feedback is anonymous. We do not store or share any personal details.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                loading && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <FontAwesome5
                    name="paper-plane"
                    size={16}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
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
    paddingTop: 50,
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#111827",
  },
  textInput: {
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
    backgroundColor: "#1E3A8A",
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