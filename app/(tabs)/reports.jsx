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
    // { id: 1, title: "Fire", icon: "flame", iconSet: 'Ionicons', color: "#f97316" },
    // { id: 2, title: "Robbery", icon: "money-bill", iconSet: 'FontAwesome5', color: "#2563eb", merchant: 'dvlppj72naeig7q' },
    {
      id: 3,
      title: "Crime",
      icon: "handcuffs",
      iconSet: "MaterialCommunityIcons",
      color: "#ef4444",
      merchant: "dvlppj72naeig7q",
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
    // { id: 5, title: "Natural Disaster", icon: "weather-hurricane", iconSet: 'MaterialCommunityIcons', color: "#8b5cf6" },
    // { id: 6, title: "Domestic Violence", icon: "home-heart", iconSet: 'MaterialCommunityIcons', color: "#ec4899", merchant: 'dvlppj72naeig7q' },
    // { id: 7, title: "Suspicious Activity", icon: "eye", iconSet: 'Ionicons', color: "#0ea5e9", merchant: 'dvlppj72naeig7q' },
    // { id: 8, title: "Theft", icon: "shopping-bag", iconSet: 'FontAwesome5', color: "#f59e0b", merchant: 'dvlppj72naeig7q' },
    // { id: 9, title: "Lost Item", icon: "help-circle", iconSet: 'Ionicons', color: "#b45309" },
    // { id: 10, title: "Leave a comment or complaint", icon: "comment" , iconSet: 'MaterialCommunityIcons', color: "#0202ff",path:'complaint' },
  ];

  const handleReport = (report) => {
    // Alert.alert(report.path)
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
    <GestureHandlerRootView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <CustomHeader
        title="Report"
        subtitle="Report a case"
        onBack={() => navigation.goBack()}
        showBackButton={true}
        showLogo={false}
      />

      <View className="p-2">
        <Text className="text-lg px-2 text-gray-600 mt-10 mb-2">
          Select the type of emergency
        </Text>

        <ScrollView>
          <View className="space-y-3 p-2 scroll-mb-10">
            {emergencyTypes.map((emergency) => (
              <TouchableOpacity
                key={emergency.id}
                onPress={() => handleReport(emergency)}
                className="bg-white rounded-xl mb-1 p-5 flex-row items-center justify-between shadow-sm"
              >
                <View className="flex-row items-center">
                  <View
                    className="w-10 h-10 rounded-lg items-center justify-center mr-4"
                    style={{ backgroundColor: emergency.color + "20" }}
                  >
                    {renderIcon(
                      emergency.iconSet,
                      emergency.icon,
                      emergency.color
                    )}
                  </View>
                  <Text className="text-base font-medium text-gray-900">
                    {emergency.title}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </TouchableOpacity>
            ))}
            <Text className="mt-10 text-gray-600">
              Feel free to leave a comment
            </Text>
            <Link
              href="/report/complaint"
              className="flex bg-white rounded-xl mt-2 p-5 w-full flex-row items-center justify-between shadow-sm"
            >
              <View className="flex-row items-center justify-between">
                <View
                  className="w-10 h-10 rounded-lg items-center justify-center mr-4"
                  style={{ backgroundColor: "#0202ff20" }}
                >
                  {renderIcon("MaterialCommunityIcons", "comment", "#0202ff")}
                </View>
                <Text className="text-base font-medium text-gray-900">
                  Leave a comment or complaint
                </Text>
              </View>
              {/* <Ionicons name="chevron-forward" size={18} color="#9ca3af" /> */}
            </Link>
          </View>
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

export default Reports;
