import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
      router.replace("/(tabs)/tackcase");
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
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Stack.Screen options={{ title: "Submitted" }} />
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, elevation: 3 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ backgroundColor: '#dcfce7', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <FontAwesome5 name="check" size={32} color="#22c55e" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#166534', marginBottom: 8 }}>Thank You!</Text>
            <Text style={{ color: '#64748b', textAlign: 'center' }}>Your {commentType.toLowerCase()} has been submitted</Text>
          </View>

          <TouchableOpacity 
            style={{ backgroundColor: '#22c55e', padding: 16, borderRadius: 12 }}
            onPress={() => setSuccess(false)}
          > 
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Submit Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ 
        title: params?.case ? `Report ${params.case}` : "Submit Feedback",
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18
        }
      }} />
      
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 16 }}>Feedback Details</Text>
        
        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 8 }}>Type</Text>
          <View style={{ 
            backgroundColor: '#f8fafc', 
            borderRadius: 8, 
            borderWidth: 1, 
            borderColor: '#e2e8f0',
            marginBottom: 16
          }}>
            <Picker
              selectedValue={commentType}
              onValueChange={(itemValue) => setCommentType(itemValue)}
              dropdownIconColor="#64748b"
            >
              {commentTypes.map((type) => (
                <Picker.Item 
                  key={type.value} 
                  label={type.label} 
                  value={type.value} 
                />
              ))}
            </Picker>
          </View>

          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 8 }}>Message</Text>
          <TextInput
            style={{
              minHeight: 120,
              textAlignVertical: 'top',
              padding: 12,
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: errors.message ? '#ef4444' : '#e2e8f0',
              marginBottom: 4
            }}
            placeholder={`Enter your ${commentType.toLowerCase()} here...`}
            multiline
            value={message}
            onChangeText={setMessage}
          />
          {errors.message && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.message}</Text>
          )}
        </View>

        <Text style={{ 
          color: '#64748b', 
          fontSize: 12, 
          textAlign: 'center',
          marginBottom: 16,
          fontStyle: 'italic'
        }}>
          Note: We do not store or share any personal details you provide.
        </Text>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#2563eb', 
            padding: 16, 
            borderRadius: 12, 
            flexDirection: 'row', 
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1
          }}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <FontAwesome5 name="paper-plane" size={16} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Submit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Case;