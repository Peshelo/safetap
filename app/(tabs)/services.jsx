import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
  TextInput,
} from "react-native";
import React, { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "../components/Icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "../components/Header";
import '../global.css'

const Services = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Social media links for ZRP (updated X from Twitter)
  const socialMediaLinks = [
    {
      id: "facebook",
      name: "Facebook",
      icon: "logo-facebook",
      color: "#1877F2",
      url: "https://www.facebook.com/p/Zimbabwe-Republic-Police-zrp-100088691142271/",
    },
    {
      id: "x",
      name: "X",
      icon: "logo-x",
      color: "#000000",
      url: "https://x.com/policezimbabwe",
    }
  ];

  // Categorized services with availability flag
  const serviceCategories = [
    {
      id: "emergency",
      title: "Quick Access",
      icon: "alert-circle",
      color: "#DC2626",
      services: [
        {
          id: 1,
          title: "Find Police Station",
          icon: "search",
          description: "Search Police Station Directory",
          available: true,
          action: () => router.push("/(tabs)/contacts"),
          badge: "MOST USED",
        },
        {
          id: 3,
          title: "News and Press Releases",
          icon: "news",
          description: "Get the latest news and press releases",
          available: true,
          action: () => router.push("/(tabs)/news"),
        },
        {
          id: 4,
          title: "Suggestion Box",
          icon: "archive",
          description: "Give Feedback",
          available: true,
          action: () => router.push("/report/complaint"),
        },
      ],
    },
    {
      id: "reporting",
      title: "Reporting",
      icon: "document-text",
      color: "#1E3A8A",
      services: [
        {
          id: 5,
          title: "Crime Report",
          icon: "shield-checkmark",
          description: "File criminal reports",
          available: false,
          action: () => showComingSoon("Crime Report"),
        },
        {
          id: 6,
          title: "Traffic Accident",
          icon: "car",
          description: "Report road accidents",
          available: false,
          action: () => showComingSoon("Traffic Accident"),
        },
        {
          id: 7,
          title: "Lost and Found",
          icon: "search",
          description: "Recover lost items",
          available: false,
          action: () => showComingSoon("Lost and Found"),
        },
        // {
        //   id: 8,
        //   title: "Noise Complaint",
        //   icon: "volume-high",
        //   description: "Report disturbances",
        //   available: false,
        //   action: () => showComingSoon("Noise Complaint"),
        // },
      ],
    },
    {
      id: "services",
      title: "Services",
      icon: "construct",
      color: "#059669",
      services: [
        {
          id: 10,
          title: "Police Clearance",
          icon: "badge",
          description: "Apply for clearance",
          available: false,
          action: () => showComingSoon("Police Clearance"),
        },
        {
          id: 11,
          title: "Feedback",
          icon: "chatbubble",
          description: "Service feedback",
          available: false,
          action: () => showComingSoon("Feedback"),
        },
        {
          id: 13,
          title: "Crime Prevention",
          icon: "shield",
          description: "Safety tips",
          available: false,
          action: () => showComingSoon("Crime Prevention"),
        },
      ],
    },
    {
      id: "information",
      title: "Information",
      icon: "information-circle",
      color: "#7C3AED",
      services: [
             {
          id: 2,
          title: "Search Police Station Contacts",
          icon: "call",
          description: "Police Station Details",
          available: true,
          action: () => router.push("/(tabs)/contacts"),
        },
        {
          id: 14,
          title: "Police Stations",
          icon: "location",
          description: "Find nearby stations",
          available: true,
          action: () => router.push("/maps"),
        },
        {
          id: 15,
          title: "Wanted Persons",
          icon: "search",
          description: "View wanted alerts",
          available: false,
          action: () => showComingSoon("Wanted Persons"),
        },
        {
          id: 17,
          title: "Lost Persons",
          icon: "call",
          description: "Report or find missing persons",
          available: false,
          action: () => showComingSoon("Lost Persons"),
        },
      ],
    }
  ];

  const availableCategories = serviceCategories.filter((category) =>
    Array.isArray(category.services) && category.services.some((service) => service.available)
  );

  const showComingSoon = () => {};

  const handleServicePress = (service) => {
    if (service.action) {
      service.action();
    } else if (!service.available) {
      showComingSoon(service.title);
    }
  };

  const openSocialMedia = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open the link");
    });
  };

  const renderIcon = (iconName, color, size = 20) => {
    const iconMappings = {
      // Ionicons
      alert: (size, color) => <Ionicons name="alert-circle" size={size} color={color} />,
      document: (size, color) => <Ionicons name="document-text" size={size} color={color} />,
      location: (size, color) => <Ionicons name="location" size={size} color={color} />,
      call: (size, color) => <Ionicons name="call" size={size} color={color} />,
      medical: (size, color) => <Ionicons name="medkit" size={size} color={color} />,
      search: (size, color) => <Ionicons name="search" size={size} color={color} />,
      shield: (size, color) => <Ionicons name="shield" size={size} color={color} />,
      badge: (size, color) => <Ionicons name="ribbon" size={size} color={color} />,
      chat: (size, color) => <Ionicons name="chatbubble" size={size} color={color} />,
      eye: (size, color) => <Ionicons name="eye" size={size} color={color} />,
      traffic: (size, color) => <Ionicons name="traffic-light" size={size} color={color} />,
      globe: (size, color) => <Ionicons name="globe" size={size} color={color} />,
      time: (size, color) => <Ionicons name="time" size={size} color={color} />,
      calendar: (size, color) => <Ionicons name="calendar" size={size} color={color} />,
      camera: (size, color) => <Ionicons name="camera" size={size} color={color} />,
      volume: (size, color) => <Ionicons name="volume-high" size={size} color={color} />,
      car: (size, color) => <Ionicons name="car" size={size} color={color} />,
      laptop: (size, color) => <Ionicons name="laptop" size={size} color={color} />,
      construct: (size, color) => <Ionicons name="construct" size={size} color={color} />,
      info: (size, color) => <Ionicons name="information-circle" size={size} color={color} />,
      news: (size, color) => <Ionicons name="newspaper" size={size} color={color} />,
      archive: (size, color) => <Ionicons name="archive" size={size} color={color} />,
      "shield-checkmark": (size, color) => <Ionicons name="shield-checkmark" size={size} color={color} />,
      
      // MaterialCommunityIcons for specific icons
      sos: (size, color) => <Ionicons name="sos" size={size} color={color} />,
      flame: (size, color) => <Ionicons name="flame" size={size} color={color} />,
    };

    const iconRenderer = iconMappings[iconName];
    return iconRenderer ? iconRenderer(size, color) : <Ionicons name="help-circle" size={size} color={color} />;
  };

  // Filter services based on search and category
  const getFilteredCategories = () => {
    return serviceCategories
      .filter(category => selectedCategory === "all" || category.id === selectedCategory)
      .map(category => ({
        ...category,
        services: category.services.filter(service => {
          // Search filter
          const matchesSearch = searchQuery === "" || 
            service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description.toLowerCase().includes(searchQuery.toLowerCase());
          
          return service.available && matchesSearch;
        })
      }))
      .filter(category => category.services.length > 0);
  };

  const filteredCategories = getFilteredCategories();

  const renderServiceItem = (service, category) => (
    <TouchableOpacity
      key={service.id}
      className={`flex-row items-center justify-between px-4 py-3.5 border-b border-gray-200 ${!service.available && 'opacity-60'}`}
      onPress={() => handleServicePress(service)}
      activeOpacity={0.7}
      disabled={!service.available}
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="w-9 h-9 rounded-lg justify-center items-center mr-3"
          style={{ backgroundColor: service.available ? `${category.color}15` : '#E5E7EB' }}
        >
          {renderIcon(service.icon, service.available ? category.color : '#9CA3AF', 20)}
        </View>
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${!service.available ? 'text-gray-500' : 'text-gray-900'}`}>
            {service.title}
          </Text>
          <Text className={`text-xs ${!service.available ? 'text-gray-400' : 'text-gray-600'}`}>
            {service.description}
          </Text>
        </View>
      </View>
      {service.badge && (
        <View 
          className={`px-2 py-1 rounded mr-2 ${service.badge === "CRITICAL" ? 'bg-red-600' : 'bg-blue-900'}`}
        >
          <Text className="text-xs font-bold text-white">{service.badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderCategory = (category) => (
    <View key={category.id} className="mb-5">
      <View className="flex-row items-center mb-3">
        <View 
          className="w-8 h-8 rounded-lg justify-center items-center mr-2"
          style={{ backgroundColor: `${category.color}15` }}
        >
          {renderIcon(category.icon, category.color, 18)}
        </View>
        <Text className="text-base font-semibold text-gray-700">{category.title}</Text>
        <Text className="text-sm text-gray-500 ml-1">({category.services.length})</Text>
      </View>
      <View className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        {category.services.map(service => renderServiceItem(service, category))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <Stack.Screen options={{ headerShown: false }} />
      
      <CustomHeader title="Services" subtitle="Zimbabwe Republic Police" showLogo compact rightComponent={(
          <TouchableOpacity 
            className="w-10 h-10 rounded-full bg-white/20 justify-center items-center"
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
      )} />

      {/* Search Bar */}
      {showSearch && (
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-1 flex-row items-center bg-gray-50 rounded-lg px-3 h-10 border border-gray-200 mr-3">
            <Ionicons name="search" size={18} color="#6b7280" className="mr-2" />
            <TextInput
              className="flex-1 text-sm text-gray-900"
              placeholder="Search services..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            className="px-3"
            onPress={() => {
              setShowSearch(false);
              setSearchQuery("");
            }}
          >
            <Text className="text-sm font-medium text-blue-900">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters Section - Inline */}
      <View className="bg-white border-b border-gray-200">
        <View className="px-4 pt-3">
          <Text className="text-sm font-semibold text-gray-700 mb-2">Filter Services</Text>
          
          {/* Category Filters */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="mb-3"
          >
            <TouchableOpacity
              className={`px-3 py-1.5 rounded-full mr-2 ${selectedCategory === "all" ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100 border border-gray-200'}`}
              onPress={() => setSelectedCategory("all")}
            >
              <Text className={`text-sm ${selectedCategory === "all" ? 'text-blue-900 font-semibold' : 'text-gray-600'}`}>
                All
              </Text>
            </TouchableOpacity>
            {availableCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                className={`px-3 py-1.5 rounded-full mr-2 ${selectedCategory === cat.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100 border border-gray-200'}`}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text className={`text-sm ${selectedCategory === cat.id ? 'text-blue-900 font-semibold' : 'text-gray-600'}`}>
                  {cat.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

        </View>

        {/* Active Filters Display */}
        {(selectedCategory !== "all" || searchQuery) && (
          <View className="px-4 pb-3">
            <Text className="text-xs font-medium text-gray-500 mb-1">Active Filters:</Text>
            <View className="flex-row flex-wrap">
              {selectedCategory !== "all" && (
                <View className="flex-row items-center bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                  <Text className="text-xs font-medium text-blue-900 mr-1">
                    Category: {availableCategories.find(c => c.id === selectedCategory)?.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedCategory("all")}>
                    <Ionicons name="close" size={12} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>
              )}
              {searchQuery && (
                <View className="flex-row items-center bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                  <Text className="text-xs font-medium text-blue-900 mr-1">
                    Search: {searchQuery}
                  </Text>
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close" size={12} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity 
                className="flex-row items-center bg-gray-200 px-2 py-1 rounded mr-2 mb-1"
                onPress={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
              >
                <Ionicons name="close-circle" size={12} color="#374151" className="mr-1" />
                <Text className="text-xs font-medium text-gray-700">Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }} // Added padding for bottom navbar
      >
        {/* All Services by Category */}
        {filteredCategories.length > 0 ? (
          <View className="mt-1">
            <View className="bg-white px-4 py-4 border-b border-gray-200">
              <Text className="text-base font-semibold text-gray-900">
                {searchQuery ? "Search Results" : "All Services"}
              </Text>
            </View>
            <View className="bg-white px-4 py-4">
              {filteredCategories.map(renderCategory)}
            </View>
          </View>
        ) : (
          <View className="items-center justify-center py-16 px-8 bg-white mt-1">
            <Ionicons name="search-outline" size={48} color="#cbd5e0" />
            <Text className="text-base font-semibold text-gray-600 mt-4 mb-2">
              No services found
            </Text>
            <Text className="text-sm text-gray-400 text-center mb-4">
              {searchQuery || selectedCategory !== "all"
                ? "Try adjusting your search or filters"
                : "No services available"}
            </Text>
            {(searchQuery || selectedCategory !== "all") && (
              <TouchableOpacity 
                className="px-5 py-2.5 bg-gray-50 rounded-lg border border-gray-300"
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
              >
                <Text className="text-sm font-semibold text-blue-900">Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Follow Us Section */}
        <View className="bg-white mt-2 px-4 py-5 border-b border-gray-200">
          <Text className="text-base font-semibold text-gray-900 mb-4">Follow ZRP</Text>
          <View className="flex-row justify-center">
            {socialMediaLinks.map((social) => (
              <TouchableOpacity
                key={social.id}
                className="items-center mx-2"
                onPress={() => openSocialMedia(social.url)}
                activeOpacity={0.7}
              >
                <View 
                  className="w-12 h-12 rounded-lg justify-center items-center mb-2"
                  style={{ backgroundColor: `${social.color}15` }}
                >
                  <Ionicons name={social.icon} size={24} color={social.color} />
                </View>
                <Text className="text-xs font-semibold text-gray-700">{social.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Links */}
        <View className="bg-white mt-2 px-4 py-5">
          <Text className="text-base font-semibold text-gray-900 mb-4">Quick Links</Text>
          <View className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            {[
              { icon: "location", label: "Police Stations Map", route: "/maps" },
              { icon: "newspaper-outline", label: "Latest News", route: "/(tabs)/news" },
              { icon: "information-circle-outline", label: "About SafeTap", route: "/(tabs)/about" },
            ].map((link, index) => (
              <TouchableOpacity 
                key={index}
                className={`flex-row items-center px-4 py-4 ${index < 2 ? 'border-b border-gray-200' : ''}`}
                onPress={() => router.push(link.route)}
              >
                <Ionicons name={link.icon} size={18} color="#1E3A8A" />
                <Text className="flex-1 text-sm font-medium text-gray-700 ml-3">{link.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer Spacing - Removed extra spacing since paddingBottom handles it */}
      </ScrollView>

    </View>
  );
};

export default Services;
