import React, { useState } from "react";
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
import pb from "../../../lib/connection";
import CustomHeader from "../../components/Header"; // Ensure this exists

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
        comment: message,
        flag: commentType,
        case: params.case || "general",
      };

      await pb.collection("comments").create(data);
      setSuccess(true);
      resetForm();
      Alert.alert(
        "Success",
        `Your ${commentType.toLowerCase()} has been submitted successfully!`
      );
      router.replace("/(tabs)/reports");
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

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Stack.Screen options={{ title: "Submitted" }} />
        <View style={styles.successCard}>
          <View style={styles.successHeader}>
            <View style={styles.successIconContainer}>
              <FontAwesome5 name="check" size={32} color="#22c55e" />
            </View>
            <Text style={styles.successTitle}>Thank You!</Text>
            <Text style={styles.successSubtitle}>
              Your {commentType.toLowerCase()} has been submitted
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.successButton]}
            onPress={() => setSuccess(false)}
          >
            <Text style={styles.buttonText}>Submit Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Custom header */}
      <CustomHeader
        title={params?.case ? `Report ${params.case}` : "Submit Feedback"}
        subtitle="Zimbabwe Republic Police"
        showBackButton={true}
        showLogo={true}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback Details</Text>

          {/* Picker */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={commentType}
                onValueChange={(itemValue) => setCommentType(itemValue)}
                dropdownIconColor="#64748b"
                style={{ color: "#0f172a" }} // make selected text visible
              >
                {commentTypes.map((type) => (
                  <Picker.Item
                    key={type.value}
                    label={type.label}
                    value={type.value}
                    color="#0f172a" // ensure picker options visible
                  />
                ))}
              </Picker>
            </View>

            {/* Message */}
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={[
                styles.textArea,
                errors.message && styles.inputError,
              ]}
              placeholder={`Enter your ${commentType.toLowerCase()} here...`}
              placeholderTextColor="#64748b"
              multiline
              value={message}
              onChangeText={setMessage}
            />
            {errors.message && (
              <Text style={styles.errorText}>{errors.message}</Text>
            )}
          </View>

          <Text style={styles.noteText}>
            Note: We do not store or share any personal details you provide.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <FontAwesome5
                  name="paper-plane"
                  size={16}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>Submit</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 16,
  },
  inputCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontWeight: "500",
    color: "#334155",
    marginBottom: 8,
  },
  pickerWrapper: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 4,
    color: "#0f172a", // text visible
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  noteText: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  successContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    elevation: 3,
  },
  successHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  successIconContainer: {
    backgroundColor: "#dcfce7",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 8,
  },
  successSubtitle: {
    color: "#64748b",
    textAlign: "center",
  },
  button: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  successButton: {
    backgroundColor: "#22c55e",
  },
});

export default Case;
