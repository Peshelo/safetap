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
import api from "../../../lib/api";
import AppHeader from "../../../src/components/AppHeader";

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
        content: message,
        category: commentType,
        tag: params.case || "general",
      };

      await api.suggestions.create(data);
      setSuccess(true);
      resetForm();
      Alert.alert(
        "Submitted",
        `Your ${commentType.toLowerCase()} has been sent to ZRP Command Office.`
      );
    } catch (error) {
      console.log("Submission error:", error);
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMessage("");
    setCommentType("COMMENT");
    setErrors({});
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader
          title="Feedback Submitted"
          subtitle="Zimbabwe Republic Police"
          showBack={true}
        />

        <View style={styles.successCard}>
          <View style={styles.successHeader}>
            <View style={styles.successIconContainer}>
              <FontAwesome5 name="check-circle" size={48} color="#16A34A" />
            </View>
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successSubtitle}>
              Your {commentType.toLowerCase()} has been submitted anonymously.
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
              onPress={() => router.replace("/(tabs)")}
            >
              <FontAwesome5 name="home" size={16} color="#0052CC" />
              <Text style={styles.secondaryButtonText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* App Bar (ZRP Blue with logo and safe area top inset) */}
      <AppHeader
        title={params?.case ? `Report ${params.case}` : "Suggestion Box"}
        subtitle="Zimbabwe Republic Police Command"
        showBack={true}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Anonymous Feedback Details</Text>
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Feedback Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={commentType}
                  onValueChange={(itemValue) => setCommentType(itemValue)}
                  dropdownIconColor="#64748B"
                  style={styles.picker}
                >
                  {commentTypes.map((type) => (
                    <Picker.Item key={type.value} label={type.label} value={type.value} color="#0F172A" />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Your Message</Text>
              <TextInput
                style={[styles.textInput, errors.message && styles.inputError]}
                placeholder={`Enter your ${commentType.toLowerCase()} here...`}
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={message}
                onChangeText={(text) => {
                  setMessage(text);
                  if (errors.message) setErrors({});
                }}
              />
              {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
            </View>

            <View style={styles.noteContainer}>
              <Ionicons name="shield-checkmark" size={16} color="#0052CC" />
              <Text style={styles.noteText}>
                Your suggestion is transmitted anonymously. SafeTap privacy protocols ensure your personal identity is protected.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <FontAwesome5 name="paper-plane" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    backgroundColor: "#0F172A",
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#D97706",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: { flex: 1, marginHorizontal: 10 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  headerSubtitle: { fontSize: 11, color: "#D97706", textAlign: "center", marginTop: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  formSection: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E3A8A", marginBottom: 10 },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  formGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 6 },
  pickerContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  picker: { height: 48, color: "#0F172A" },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    padding: 12,
    fontSize: 15,
    color: "#0F172A",
    minHeight: 120,
  },
  inputError: { borderColor: "#DC2626" },
  errorText: { color: "#DC2626", fontSize: 12, marginTop: 4 },
  noteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#E6EFFC",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  noteText: { fontSize: 12, color: "#0052CC", marginLeft: 8, flex: 1, lineHeight: 16 },
  submitButton: {
    backgroundColor: "#0052CC",
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  successContainer: { flex: 1, backgroundColor: "#F8FAFC" },
  successCard: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  successHeader: { alignItems: "center", marginBottom: 28 },
  successIconContainer: { marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: "800", color: "#16A34A", marginBottom: 6 },
  successSubtitle: { fontSize: 14, color: "#475569", textAlign: "center" },
  successButtons: { width: "100%", maxWidth: 360 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 10,
  },
  primaryButton: { backgroundColor: "#0052CC" },
  secondaryButton: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1" },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", marginLeft: 8 },
  secondaryButtonText: { color: "#0052CC", fontSize: 15, fontWeight: "700", marginLeft: 8 },
});

export default Case;