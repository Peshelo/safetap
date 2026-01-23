import { View, TextInput, Button, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useState } from "react";

export default function Initial() {
  const [phone, setPhone] = useState("");

  const savePhone = async () => {
    if (phone.trim().length < 9) {
      Alert.alert("Invalid number");
      return;
    }

    await AsyncStorage.setItem("phoneNumber", phone.trim());
    router.replace("/(tabs)");
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <TextInput
        placeholder="Enter phone number"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        style={{
          borderWidth: 1,
          padding: 14,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />
      <Button title="Continue" onPress={savePhone} />
    </View>
  );
}
