import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
  TextInput,
  FlatList,
  RefreshControl,
  Image,
} from "react-native";
import React, { useState, useEffect } from "react";
import { router, Stack } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import pb from "../../lib/connection";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const TrafficViolations = () => {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [licenceNumber, setLicenceNumber] = useState("");
  const [violations, setViolations] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all traffic violations on component mount (optional - for admin view)
  const fetchAllViolations = async () => {
    try {
      setLoading(true);
      const records = await pb.collection("traffic_violations").getFullList({
        sort: "-created",
      });
      setViolations(records);
    } catch (err) {
      setError("Failed to fetch traffic violations");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Search for violations by licence number
  const searchViolations = async () => {
    if (!licenceNumber.trim()) {
      Alert.alert("Error", "Please enter a licence number");
      return;
    }

    try {
      setSearchLoading(true);
      setError(null);

      // Search for violations with the specific licence number
      const records = await pb.collection("traffic_violations").getFullList({
        filter: `licence_number ~ "${licenceNumber.trim()}"`,
        sort: "-created",
      });

      setViolations(records);
      setHasSearched(true);
    } catch (err) {
      setError("Failed to search for violations");
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (hasSearched && licenceNumber.trim()) {
      searchViolations();
    } else {
      fetchAllViolations();
    }
  };

  const renderViolationItem = ({ item }) => (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900 mb-1">
            Licence: {item.licence_number}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-center mb-2">
            <View
              className={`px-3 py-1 rounded-full ${
                item.isSorted ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  item.isSorted ? "text-green-800" : "text-red-800"
                }`}
              >
                {item.isSorted ? "Resolved" : "Pending"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Violation Details */}
      {item.violation_type && (
        <View className="mb-2">
          <Text className="text-sm text-gray-600">
            <Text className="font-medium">Type: </Text>
            {item.violation_type}
          </Text>
        </View>
      )}

      {item.fine_amount && (
        <View className="mb-2">
          <Text className="text-sm text-gray-600">
            <Text className="font-medium">Fine: </Text>${item.fine_amount}
          </Text>
        </View>
      )}

      {item.location && (
        <View className="mb-3">
          <Text className="text-sm text-gray-600">
            <Text className="font-medium">Location: </Text>
            {item.location}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {!item.isSorted && (
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Contact Support", "Call +263242255583 for assistance")
          }
          className="bg-blue-600 rounded-lg py-2 px-4"
        >
          <Text className="text-white text-center font-medium">Get Help</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={customStyles.headerContainer}>
      <View style={customStyles.headerContent}>
        <View style={customStyles.titleSection}>
          <Text style={customStyles.headerTitle}>Traffic Violations</Text>
        </View>
        <View style={customStyles.headerRight}>
          {/* <TouchableOpacity
            onPress={handleSync}
            disabled={syncing}
            style={[
              customStyles.syncButton,
              syncing && customStyles.syncButtonDisabled,
            ]}
          >
            <MaterialIcons
              name="sync"
              size={20}
              color={syncing ? "#94a3b8" : "#fff"}
            />
          </TouchableOpacity> */}
          <Image
            source={require("../../assets/images/logo.jpg")}
            style={customStyles.logoImage}
          />
        </View>
      </View>
    </View>
  );

  const renderGuidanceSection = () => (
    <View className="bg-blue-50 rounded-xl p-4 mb-6">
      <View className="flex-row items-center mb-3">
        <FontAwesome5 name="info-circle" size={20} color="#2563eb" />
        <Text className="text-lg font-semibold text-blue-900 ml-2">
          What to do if you have violations
        </Text>
      </View>

      <View className="space-y-3">
        <View className="flex-row items-start">
          <Text className="text-blue-600 font-bold mr-2">1.</Text>
          <Text className="text-blue-800 flex-1">
            <Text className="font-medium">Review the details</Text> - Check the
            violation type, date, and location
          </Text>
        </View>

        <View className="flex-row items-start">
          <Text className="text-blue-600 font-bold mr-2">2.</Text>
          <Text className="text-blue-800 flex-1">
            <Text className="font-medium">Pay the fine</Text> - Visit the
            nearest police station or use online payment methods
          </Text>
        </View>

        <View className="flex-row items-start">
          <Text className="text-blue-600 font-bold mr-2">3.</Text>
          <Text className="text-blue-800 flex-1">
            <Text className="font-medium">Contest if necessary</Text> - If you
            believe the violation is incorrect, contact support
          </Text>
        </View>

        <View className="flex-row items-start">
          <Text className="text-blue-600 font-bold mr-2">4.</Text>
          <Text className="text-blue-800 flex-1">
            <Text className="font-medium">Keep records</Text> - Save payment
            receipts and documentation
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push("(tabs)/contacts")}
        className="bg-blue-600 rounded-lg py-3 px-4 mt-4"
      >
        <Text className="text-white text-center font-medium">
          Find Nearest Police Station
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <GestureHandlerRootView className="flex-1 bg-gray-50">
      <StatusBar barStyle={"dark-content"} backgroundColor={"#fff"} />
      <Stack.Screen
        options={{
          title: "Traffic Violations",
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2563eb"]}
            tintColor="#2563eb"
          />
        }
      >
        <View className="px-5 pt-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Check Traffic Violations
            </Text>
            <Text className="text-gray-600">
              Enter your licence number to check for any outstanding violations
            </Text>
          </View>

          {/* Search Section */}
          <View className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Search by Licence Number
            </Text>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <TextInput
                  className="border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="Enter licence number (e.g. ABC1234)"
                  value={licenceNumber}
                  onChangeText={setLicenceNumber}
                  autoCapitalize="characters"
                  style={{ fontFamily: "monospace" }}
                />
              </View>
              <TouchableOpacity
                onPress={searchViolations}
                disabled={searchLoading}
                className="bg-blue-600 rounded-lg px-6 py-3 justify-center"
              >
                {searchLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <FontAwesome5 name="search" size={16} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Results Section */}
          {hasSearched && (
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-900">
                  Search Results
                </Text>
                {violations.length > 0 && (
                  <View className="bg-gray-100 px-3 py-1 rounded-full">
                    <Text className="text-gray-600 text-sm">
                      {violations.length} violation
                      {violations.length !== 1 ? "s" : ""} found
                    </Text>
                  </View>
                )}
              </View>

              {error ? (
                <View className="bg-red-50 p-4 rounded-lg">
                  <Text className="text-red-600 mb-2">{error}</Text>
                  <TouchableOpacity onPress={searchViolations}>
                    <Text className="text-blue-600">Try again</Text>
                  </TouchableOpacity>
                </View>
              ) : violations.length === 0 ? (
                <View className="bg-green-50 p-6 rounded-lg items-center">
                  <FontAwesome5 name="check-circle" size={32} color="#10b981" />
                  <Text className="text-green-800 font-semibold mt-2 mb-1">
                    No Violations Found
                  </Text>
                  <Text className="text-green-600 text-center">
                    Great news! No traffic violations found for licence number:{" "}
                    {licenceNumber}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={violations}
                  renderItem={renderViolationItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}

          {/* Guidance Section - Only show when violations exist */}
          {hasSearched && violations.length > 0 && renderGuidanceSection()}

          {/* Emergency Contact Section */}
          <View className="bg-orange-50 rounded-xl p-4">
            <View className="flex-row items-center mb-3">
              <FontAwesome5 name="phone" size={18} color="#ea580c" />
              <Text className="text-lg font-semibold text-orange-900 ml-2">
                Need Help?
              </Text>
            </View>
            <Text className="text-orange-800 mb-3">
              If you have questions about your violations or need assistance
              with payments, contact our support team.
            </Text>
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Contact Support",
                  "Call +263242255583 for traffic violation assistance"
                )
              }
              className="bg-orange-600 rounded-lg py-3 px-4"
            >
              <Text className="text-white text-center font-medium">
                Contact Support: +263242255583
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const customStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#2563eb",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#c7d2fe",
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  syncButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 50,
  },
  syncButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
});

export default TrafficViolations;
