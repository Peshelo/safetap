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
} from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from 'expo-secure-store';
import pb from "../../lib/connection";
import { Stack, useLocalSearchParams } from "expo-router";

const cities = [
  "Harare", "Bulawayo", "Chitungwiza", "Mutare", "Epworth", 
  "Gweru", "Kwekwe", "Kadoma", "Masvingo", "Chinhoyi",
  "Marondera", "Beitbridge", "Victoria Falls", "Zvishavane",
  "Masvingo", "Norton", "Redcliff", "Shurugwi", "Chegutu",
  "Kariba", "Bindura", "Goromonzi", "Murehwa", "Mutoko",
  "Bikita", "Chiredzi", "Chipinge", "Nyanga", "Rusape",
  "Mudzi", "Hwedza", "Seke", "Zvimba", "Makonde",
  "Mhangura", "Zaka", "Buhera", "Chikomba", "Gutu",
  "Insiza", "Matobo", "Umguza", "Bubi", "Mangwe",
  "Nkayi", "Lupane", "Hwange", "Binga", "Beitbridge",
  "Chiredzi", "Masvingo", "Shurugwi", "Kwekwe", "Gweru",
];

const priorities = [
  { label: "Low", value: "green" },
  { label: "Medium", value: "yellow" },
  { label: "High", value: "red" },
];

const Case = () => {
  const params = useLocalSearchParams();
  const [description, setDescription] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [location, setLocation] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [caseId, setCaseId] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const requestLocationPermission = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required.");
        return;
      }
      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation(userLocation.coords);
    };

    const fetchMerchants = async () => {
      try {
        const records = await pb.collection("merchant").getFullList();
        setMerchants(records);
      } catch (error) {
        Alert.alert("Error", "Failed to fetch merchants.");
      }
    };

    requestLocationPermission();
    fetchMerchants();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!description) newErrors.description = "Description is required";
    if (!selectedCity) newErrors.city = "City is required";
    if (!selectedPriority) newErrors.priority = "Priority is required";
    if (!selectedMerchant) newErrors.merchant = "Merchant is required";
    return newErrors;
  };

  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
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
      const formData = new FormData();
      formData.append("title", params.case);
      formData.append("description", description);
      formData.append("city", selectedCity);
      formData.append("phoneNumber", phone_number);
      formData.append("address", await SecureStore.getItemAsync('user_address'));
      formData.append("latitude", location.latitude.toString());
      formData.append("longitude", location.longitude.toString());
      // All got to traffic and will be assigned to the merchant
      formData.append("merchant", "dvlppj72naeig7q");
     
      // formData.append("merchant", selectedMerchant);
      formData.append("status", "Open");
      formData.append("priority", "red");
      // formData.append("phoneNumber", await SecureStore.getItemAsync('user_phone'));

      if (imageUri) {
        const fileName = imageUri.split("/").pop();
        formData.append("images", {
          uri: imageUri,
          name: fileName,
          type: "image/jpeg",
        });
      }

      const record = await pb.collection("cases").create(formData);
      setCaseId(record.id);
      setSuccess(true);
      resetForm();
    } catch (error) {
      Alert.alert("Error", "Failed to submit the case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setSelectedCity("");
    setSelectedPriority("");
    setPhoneNumber("");
    setSelectedMerchant("");
    setImageUri(null);
    setErrors({});
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(caseId);
    Alert.alert("Copied!", "Case ID has been copied to your clipboard.");
  };

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Stack.Screen options={{ title: "Report Submitted" }} />
        <View style={{ backgroundColor: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, elevation: 3 }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <View style={{ backgroundColor: '#dcfce7', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="checkmark-done" size={32} color="#22c55e" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#166534', marginBottom: 8 }}>Report Submitted!</Text>
            <Text style={{ color: '#64748b', textAlign: 'center' }}>Your case has been successfully submitted</Text>
          </View>

          <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <Text style={{ color: '#64748b', marginBottom: 4 }}>Case ID</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#166534' }}>{caseId}</Text>
          </View>

          <TouchableOpacity 
            style={{ backgroundColor: '#2563eb', padding: 16, borderRadius: 12, marginBottom: 12 }}
            onPress={copyToClipboard}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Copy Case ID</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ backgroundColor: '#22c55e', padding: 16, borderRadius: 12 }}
            onPress={() => setSuccess(false)}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Submit Another Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ 
        title: `Report ${params?.case}`,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18
        }
      }} />
      
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 16 }}>Emergency Details</Text>
        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 8 }}>Phone Number</Text>
          <TextInput
            style={{
              textAlignVertical: 'top',
              padding: 12,
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: errors.description ? '#ef4444' : '#e2e8f0',
              marginBottom: 4
            }}
            placeholder="Enter your phoneNumber..."
            value={phone_number}
            onChangeText={setPhoneNumber}
          />
          {errors.description && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.description}</Text>
          )}
        </View>
      
        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 8 }}>Description</Text>
          <TextInput
            style={{
              minHeight: 120,
              textAlignVertical: 'top',
              padding: 12,
              backgroundColor: '#f8fafc',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: errors.description ? '#ef4444' : '#e2e8f0',
              marginBottom: 4
            }}
            placeholder="Describe the emergency in detail..."
            multiline
            value={description}
            onChangeText={setDescription}
          />
          {errors.description && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.description}</Text>
          )}
        </View>

        {/* <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 8 }}>Location</Text>
          <View style={{ borderWidth: 1, borderColor: errors.city ? '#ef4444' : '#e2e8f0', borderRadius: 8, marginBottom: 12 }}>
            <Picker
              selectedValue={selectedCity}
              onValueChange={(itemValue) => setSelectedCity(itemValue)}
              style={{ backgroundColor: '#f8fafc' }}
            >
              <Picker.Item label="Select a city" value="" />
              {cities.map((city, index) => (
                <Picker.Item key={index} label={city} value={city} />
              ))}
            </Picker>
          </View>
          {errors.city && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: -8, marginBottom: 8 }}>{errors.city}</Text>
          )}

          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 8 }}>Priority Level</Text>
          <View style={{ borderWidth: 1, borderColor: errors.priority ? '#ef4444' : '#e2e8f0', borderRadius: 8 }}>
            <Picker
              selectedValue={selectedPriority}
              onValueChange={(itemValue) => setSelectedPriority(itemValue)}
              style={{ backgroundColor: '#f8fafc' }}
            >
              <Picker.Item label="Select priority" value="" />
              {priorities.map((priority) => (
                <Picker.Item key={priority.label} label={priority.label} value={priority.value} />
              ))}
            </Picker>
          </View>
          {errors.priority && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.priority}</Text>
          )}
        </View> */}
{/* 
        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 8 }}>Assigned Merchant</Text>
          <View style={{ borderWidth: 1, borderColor: errors.merchant ? '#ef4444' : '#e2e8f0', borderRadius: 8 }}>
            <Picker
              selectedValue={selectedMerchant}
              onValueChange={(itemValue) => setSelectedMerchant(itemValue)}
              style={{ backgroundColor: '#f8fafc' }}
            >
              <Picker.Item label="Select merchant" value="" />
              {merchants.map((merchant) => (
                <Picker.Item key={merchant.id} label={merchant.name} value={merchant.id} />
              ))}
            </Picker>
          </View>
          {errors.merchant && (
            <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{errors.merchant}</Text>
          )}
        </View> */}

        <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: '500', color: '#334155', marginBottom: 12 }}>Attach Photo (Optional)</Text>
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#f1f5f9', 
              borderWidth: 1, 
              borderColor: '#e2e8f0', 
              borderStyle: 'dashed', 
              borderRadius: 8, 
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onPress={handleImagePick}
          >
            <FontAwesome5 name="camera" size={24} color="#64748b" style={{ marginBottom: 8 }} />
            <Text style={{ color: '#64748b' }}>Upload Image</Text>
          </TouchableOpacity>
          {imageUri && (
            <Image 
              source={{ uri: imageUri }} 
              style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 12 }} 
              resizeMode="cover"
            />
          )}
        </View>

        <TouchableOpacity 
          style={{ 
            backgroundColor: '#2563eb', 
            padding: 16, 
            borderRadius: 12, 
            flexDirection: 'row', 
            justifyContent: 'center',
            opacity: loading ? 0.7 : 1
          }}
          onPress={handleSubmitReport}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <FontAwesome5 name="paper-plane" size={16} color="white" style={{ marginRight: 8 }} />
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Submit Report</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Case;