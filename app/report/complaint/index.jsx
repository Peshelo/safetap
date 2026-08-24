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
  Image,
} from "react-native";
import { Ionicons } from "../../components/Icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import api from "../../../lib/connection";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const commentTypes = [
  { label: "Comment", value: "COMMENT" },
  { label: "Complaint", value: "COMPLAINT" },
  { label: "Suggestion", value: "SUGGESTION" },
  { label: "Other", value: "OTHER" },
];

// AAC in an MPEG-4 container is compact and supported by modern portal browsers.
const VOICE_NOTE_PRESET = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 32000,
  numberOfChannels: 1,
  bitRate: 64000,
  web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
};

const Case = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const isPersonReport = Boolean(params.person_id);
  const [message, setMessage] = useState("");
  const [commentType, setCommentType] = useState("COMMENT");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [userPhoneNumber, setUserPhoneNumber] = useState("");
  const [citizenName, setCitizenName] = useState("");
  const [images, setImages] = useState([]);
  const [voiceNote, setVoiceNote] = useState(null);
  const audioRecorder = useAudioRecorder(VOICE_NOTE_PRESET);
  const recorderState = useAudioRecorderState(audioRecorder, 200);

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
    if (!message.trim() && !voiceNote?.uri) newErrors.message = "Write a message or record a voice note";
    return newErrors;
  };

  const handleSubmit = async () => {
    if (recorderState.isRecording) return Alert.alert("Finish recording", "Stop the voice note before submitting your feedback.");
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const data = {
        comment: message.trim() || "Voice note submitted",
        flag: isPersonReport ? "PERSON_REPORT" : commentType,
        case: params.case || "general",
        user_phone: userPhoneNumber || null, // Include user's phone number if available
        citizen_name: citizenName.trim() || null,
        timestamp: new Date().toISOString(),
        status: "pending",
        images,
        voice_note: voiceNote,
        related_person_id: params.person_id || null,
        subject: params.person_name ? `Information about ${params.person_name}` : undefined,
      };

      await api.collection("comments").create(data);
      setSuccess(true);
      resetForm();
      Alert.alert(
        "Success",
        isPersonReport ? "Your information has been submitted securely." : `Your ${commentType.toLowerCase()} has been submitted successfully!`
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
    setImages([]);
    setVoiceNote(null);
    setCitizenName("");
  };

  const addAssets = async (assets = []) => {
    const compressed = await Promise.all(assets.map(async (asset, index) => {
      try {
        const actions = asset.width > 1600 ? [{ resize: { width: 1600 } }] : [];
        const result = await manipulateAsync(asset.uri, actions, { compress: 0.72, format: SaveFormat.JPEG });
        return { ...asset, uri: result.uri, width: result.width, height: result.height, fileName: `feedback-${Date.now()}-${index + 1}.jpg`, mimeType: "image/jpeg" };
      } catch {
        return asset;
      }
    }));
    setImages((current) => [...current, ...compressed.filter((asset) => !current.some((item) => item.uri === asset.uri))].slice(0, 3));
  };

  const stopVoiceRecording = async () => {
    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        setVoiceNote({ uri: audioRecorder.uri, durationMillis: Math.min(recorderState.durationMillis || 60000, 60000), fileName: "voice-note.m4a", mimeType: "audio/mp4" });
      }
      await setAudioModeAsync({ allowsRecording: false });
    } catch (error) {
      Alert.alert("Recording error", "The voice note could not be saved.");
    }
  };

  const startVoiceRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return Alert.alert("Microphone permission needed", "Allow microphone access in device settings to record a voice note.");
    try {
      setVoiceNote(null);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record({ forDuration: 60 });
    } catch (error) {
      Alert.alert("Recording error", "Voice recording could not be started.");
    }
  };

  useEffect(() => {
    if (recorderState.isRecording && recorderState.durationMillis >= 59800) stopVoiceRecording();
  }, [recorderState.isRecording, recorderState.durationMillis]);

  const formatRecordingTime = (duration = 0) => `0:${String(Math.min(60, Math.floor(duration / 1000))).padStart(2, "0")}`;

  const chooseImages = async () => {
    if (images.length >= 3) return Alert.alert("Attachment limit", "You can attach up to three images.");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Photos permission needed", "Allow photo access in your device settings to attach an image.");
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) addAssets(result.assets);
  };

  const takePhoto = async () => {
    if (images.length >= 3) return Alert.alert("Attachment limit", "You can attach up to three images.");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return Alert.alert("Camera permission needed", "Allow camera access in your device settings to take a photo.");
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled) addAssets(result.assets);
  };

  const handlePhoneNumberUpdate = async () => {
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
              <Ionicons name="check-circle" size={48} color="#059669" />
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
              <Ionicons name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Submit Another</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.replace("/(tabs)/services")}
            >
              <Ionicons name="home" size={16} color="#1E3A8A" />
              <Text style={styles.secondaryButtonText}>Go to Services</Text>
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
            {isPersonReport ? `Report information` : (params?.case ? `Report ${params.case}` : "Submit Feedback")}
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
        <View style={styles.introCard}>
          <View style={styles.introIcon}><Ionicons name="chatbox-ellipses-outline" size={24} color="#1E3A8A" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>{isPersonReport ? `Information about ${params.person_name}` : "Your voice matters"}</Text>
            <Text style={styles.introText}>{isPersonReport ? "Provide a sighting or other useful information securely. You may use text, a voice note, or both." : "Share a comment, complaint, or suggestion directly with ZRP."}</Text>
          </View>
        </View>

        {/* Feedback Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>{isPersonReport ? "Report details" : "Feedback Details"}</Text>
          <View style={styles.formCard}>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Contact details <Text style={styles.optionalText}>(optional)</Text></Text>
              <Text style={styles.attachmentHint}>Leave these blank if you prefer to remain anonymous.</Text>
              <TextInput style={styles.singleLineInput} placeholder="Your name" placeholderTextColor="#9CA3AF" value={citizenName} onChangeText={setCitizenName} autoCapitalize="words" />
              <TextInput style={styles.singleLineInput} placeholder="Phone number or email" placeholderTextColor="#9CA3AF" value={userPhoneNumber} onChangeText={setUserPhoneNumber} keyboardType="email-address" autoCapitalize="none" />
            </View>
            
            {/* Feedback type */}
            {!isPersonReport && <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Feedback Type</Text>
              <View style={styles.typeGrid}>
                {commentTypes.map((type) => (
                  <TouchableOpacity key={type.value} style={[styles.typeChip, commentType === type.value && styles.typeChipActive]} onPress={() => setCommentType(type.value)}>
                    <Text style={[styles.typeChipText, commentType === type.value && styles.typeChipTextActive]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>}

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Voice note <Text style={styles.optionalText}>(optional)</Text></Text>
              <Text style={styles.attachmentHint}>Compressed recording, maximum 1 minute</Text>
              {recorderState.isRecording ? (
                <View style={styles.recordingCard}>
                  <View style={styles.recordingPulse} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recordingTitle}>Recording voice note</Text>
                    <Text style={styles.recordingTime}>{formatRecordingTime(recorderState.durationMillis)} / 1:00</Text>
                  </View>
                  <TouchableOpacity style={styles.stopRecordingButton} onPress={stopVoiceRecording}><Ionicons name="stop" size={18} color="#FFFFFF" /></TouchableOpacity>
                </View>
              ) : voiceNote ? (
                <View style={styles.recordedCard}>
                  <View style={styles.voiceIcon}><Ionicons name="mic" size={20} color="#1E3A8A" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.recordingTitle}>Voice note ready</Text><Text style={styles.recordingTime}>{formatRecordingTime(voiceNote.durationMillis)}</Text></View>
                  <TouchableOpacity onPress={() => setVoiceNote(null)} style={styles.removeVoiceButton}><Ionicons name="trash-outline" size={18} color="#DC2626" /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.voiceRecordButton} onPress={startVoiceRecording}>
                  <Ionicons name="mic-outline" size={21} color="#1E3A8A" />
                  <Text style={styles.attachmentButtonText}>Record voice note</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Message Input */}
            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Your Message</Text>
              <TextInput
                style={[
                  styles.textInput,
                  errors.message && styles.inputError,
                ]}
                placeholder={isPersonReport ? "Describe what you saw or know…" : `Enter your ${commentType.toLowerCase()} here...`}
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

            <View style={styles.formGroup}>
              <View style={styles.attachmentHeading}>
                <View>
                  <Text style={styles.inputLabel}>Add photos <Text style={styles.optionalText}>(optional)</Text></Text>
                  <Text style={styles.attachmentHint}>Up to 3 images, 10MB each</Text>
                </View>
                <Text style={styles.attachmentCount}>{images.length}/3</Text>
              </View>
              <View style={styles.attachmentActions}>
                <TouchableOpacity style={styles.attachmentButton} onPress={takePhoto} disabled={images.length >= 3}>
                  <Ionicons name="camera-outline" size={20} color="#1E3A8A" />
                  <Text style={styles.attachmentButtonText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.attachmentButton} onPress={chooseImages} disabled={images.length >= 3}>
                  <Ionicons name="images-outline" size={20} color="#1E3A8A" />
                  <Text style={styles.attachmentButtonText}>Gallery</Text>
                </TouchableOpacity>
              </View>
              {images.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
                {images.map((image, index) => (
                  <View key={image.uri} style={styles.previewWrap}>
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <TouchableOpacity style={styles.removeImage} onPress={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                      <Ionicons name="close" size={15} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>}
            </View>

            {/* Note */}
            <View style={styles.noteContainer}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.noteText}>
                Your feedback is handled confidentially. Contact details are optional and are used only when ZRP needs to follow up.
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
                  <Ionicons
                    name="paper-plane"
                    size={16}
                    color="#FFFFFF"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.submitButtonText}>{isPersonReport ? "Submit information" : "Submit Feedback"}</Text>
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
  introCard: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 14, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE", flexDirection: "row", alignItems: "center" },
  introIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  introTitle: { color: "#0F172A", fontFamily: "GoogleSans_600SemiBold", fontSize: 16 },
  introText: { color: "#475569", fontSize: 12.5, lineHeight: 18, marginTop: 3 },
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
    borderRadius: 16,
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
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { minWidth: "47%", flexGrow: 1, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC", paddingVertical: 11, alignItems: "center" },
  typeChipActive: { backgroundColor: "#1E3A8A", borderColor: "#1E3A8A" },
  typeChipText: { color: "#475569", fontFamily: "GoogleSans_500Medium", fontSize: 13 },
  typeChipTextActive: { color: "#FFFFFF" },
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    fontSize: 16,
    color: "#111827",
    minHeight: 120,
    textAlignVertical: "top",
  },
  singleLineInput: { marginTop: 10, height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F9FAFB", paddingHorizontal: 12, fontSize: 15, color: "#111827" },
  attachmentHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  optionalText: { color: "#94A3B8", fontFamily: "GoogleSans_400Regular" },
  attachmentHint: { color: "#94A3B8", fontSize: 11.5, marginTop: -3 },
  attachmentCount: { color: "#64748B", fontFamily: "GoogleSans_500Medium", fontSize: 12 },
  attachmentActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  attachmentButton: { flex: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  attachmentButtonText: { color: "#1E3A8A", fontFamily: "GoogleSans_500Medium", fontSize: 13 },
  previewRow: { gap: 10, paddingTop: 12, paddingRight: 4 },
  previewWrap: { position: "relative" },
  previewImage: { width: 88, height: 88, borderRadius: 12, backgroundColor: "#E2E8F0" },
  removeImage: { position: "absolute", right: -5, top: -5, width: 24, height: 24, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  voiceRecordButton: { minHeight: 50, marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", backgroundColor: "#EFF6FF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  recordingCard: { marginTop: 12, minHeight: 66, borderRadius: 12, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  recordedCard: { marginTop: 12, minHeight: 66, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 12, flexDirection: "row", alignItems: "center", gap: 11 },
  recordingPulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#DC2626" },
  recordingTitle: { color: "#0F172A", fontSize: 13, fontWeight: "600" },
  recordingTime: { color: "#64748B", fontSize: 12, marginTop: 3 },
  stopRecordingButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#DC2626", alignItems: "center", justifyContent: "center" },
  voiceIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  removeVoiceButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
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
    borderRadius: 12,
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
