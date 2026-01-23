import { View, Text, TouchableOpacity, Image, Alert } from "react-native";
import React from "react";
import { Link, Stack, useRouter } from "expo-router";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import CustomHeader from "../components/Header";
import { useNavigation } from "@react-navigation/native";

const Reports = () => {
  const router = useRouter();
  const navigation = useNavigation();

  const emergencyTypes = [
    {
      id: 3,
      title: "Crime",
      icon: "handcuffs",
      iconSet: "MaterialCommunityIcons",
      color: "#ef4444",
      path: "crime",
    },
    {
      id: 4,
      title: "Accident",
      icon: "car-crash",
      iconSet: "FontAwesome5",
      color: "#eab308",
      path: "accident",
    },
  ];

  const handleReport = (report) => {
    router.push(`/report/${report.title}`);
  };

  const renderIcon = (iconSet, iconName, color) => {
    switch (iconSet) {
      case "Ionicons":
        return <Ionicons name={iconName} size={24} color={color} />;
      case "MaterialCommunityIcons":
        return (
          <MaterialCommunityIcons name={iconName} size={24} color={color} />
        );
      case "FontAwesome5":
        return <FontAwesome5 name={iconName} size={20} color={color} />;
      default:
        return <Ionicons name={iconName} size={24} color={color} />;
    }
  };

  return (
    <GestureHandlerRootView className="flex-1 bg-gray-100">
      <Stack.Screen options={{ headerShown: false }} />

      <CustomHeader
        title="Report"
        subtitle="Report a case"
        onBack={() => navigation.goBack()}
        showBackButton
        showLogo={false}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-6">
          <Text className="text-sm uppercase tracking-wider text-gray-500 mb-2">
            Emergency types
          </Text>
          <Text className="text-lg font-semibold text-gray-900 mb-6">
            What would you like to report?
          </Text>

          <View className="space-y-4">
            {emergencyTypes.map((emergency) => (
              <TouchableOpacity
                key={emergency.id}
                activeOpacity={0.85}
                onPress={() => handleReport(emergency)}
                className="bg-white rounded-2xl px-5 py-6 mt-3 flex-row items-center justify-between shadow-slate-50 shadow"
              >
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: emergency.color + "20" }}
                  >
                    {renderIcon(
                      emergency.iconSet,
                      emergency.icon,
                      emergency.color
                    )}
                  </View>

                  <View>
                    <Text className="text-base font-semibold text-gray-900">
                      {emergency.title}
                    </Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      Tap to continue
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Secondary action */}
          <View className="mt-10">
            <Text className="text-sm text-gray-500 mb-3">
              Other feedback
            </Text>

            <Link
              href="/report/complaint"
              className="bg-white rounded-2xl px-5 py-6 flex-row items-center justify-between shadow"
            >
              <View className="flex-row items-center">
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                  style={{ backgroundColor: "#0202ff20" }}
                >
                  {renderIcon(
                    "MaterialCommunityIcons",
                    "comment",
                    "#0202ff"
                  )}
                </View>
                <View>
                  <Text className="text-base font-semibold text-gray-900">
                    Comment or Complaint
                  </Text>
                  <Text className="text-sm text-gray-500 mt-1">
                    Leave feedback or suggestions
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="#9ca3af"
              />
            </Link>
          </View>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

export default Reports;
