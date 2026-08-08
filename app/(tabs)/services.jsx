import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Linking,
  Alert,
  TextInput,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import analyticsService from "../../src/services/analyticsService";
import AppHeader from "../../src/components/AppHeader";
import { colors, radius, spacing, typography, componentHeights, borders } from "../../src/constants/theme";
import { useAppTheme } from "../../src/context/ThemeContext";

const PATTERN_BG = require("../../assets/images/fallback.png");

const Services = () => {
  const router = useRouter();
  const { colors: themeColors, isDark } = useAppTheme();
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterByAvailability, setFilterByAvailability] = useState("all");

  useEffect(() => {
    analyticsService.trackFeature("Public Services");
  }, []);

  // Social media links for ZRP (updated X from Twitter)
  const socialMediaLinks = [
    {
      id: "facebook",
      name: "Facebook",
      icon: "logo-facebook",
      color: "#1877F2",
      url: "https://www.facebook.com/ZimbabweRepublicPolice",
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
          action: () => router.push("(tabs)/contacts"),
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
          action: () => router.push("/services/clearance"),
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

  const showComingSoon = (title) => {
    setComingSoonTitle(title);
    setShowComingSoonModal(true);
  };

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
      sos: (size, color) => <MaterialCommunityIcons name="sos" size={size} color={color} />,
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
          
          // Availability filter
          const matchesAvailability = 
            filterByAvailability === "all" ||
            (filterByAvailability === "available" && service.available) ||
            (filterByAvailability === "coming_soon" && !service.available);
          
          return matchesSearch && matchesAvailability;
        })
      }))
      .filter(category => category.services.length > 0);
  };

  const filteredCategories = getFilteredCategories();

  const renderServiceItem = (service, category) => (
    <TouchableOpacity
      key={service.id}
      style={[
        styles.serviceRowItem,
        { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border },
        !service.available && { opacity: 0.6 },
      ]}
      onPress={() => handleServicePress(service)}
      activeOpacity={0.7}
      disabled={!service.available}
    >
      <View style={styles.serviceItemLeft}>
        <View 
          style={[
            styles.serviceIconBadge,
            { backgroundColor: service.available ? `${category.color}15` : themeColors.sectionBg, borderRadius: 7 },
          ]}
        >
          {renderIcon(service.icon, service.available ? (isDark ? themeColors.primary : category.color) : themeColors.textMuted, 20)}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serviceTitleText, { color: themeColors.textPrimary }]}>
            {service.title}
          </Text>
          <Text style={[styles.serviceSubText, { color: themeColors.textSecondary }]}>
            {service.description}
          </Text>
        </View>
      </View>
      {!service.available && (
        <View style={[styles.soonTag, { backgroundColor: themeColors.sectionBg, borderColor: themeColors.border }]}>
          <Text style={[styles.soonTagText, { color: themeColors.textMuted }]}>SOON</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={themeColors.textMuted} />
    </TouchableOpacity>
  );

  const renderCategory = (category) => (
    <View key={category.id} style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, paddingHorizontal: 4 }}>
        <View 
          style={{
            width: 28,
            height: 28,
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 8,
            backgroundColor: isDark ? themeColors.sectionBg : `${category.color}15`,
          }}
        >
          {renderIcon(category.icon, isDark ? themeColors.primary : category.color, 16)}
        </View>
        <Text style={{ fontSize: 14, fontWeight: "700", color: themeColors.primary }}>{category.title}</Text>
        <Text style={{ fontSize: 12, color: themeColors.textMuted, marginLeft: 4 }}>({category.services.length})</Text>
      </View>
      <View style={{ backgroundColor: themeColors.surface, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border, overflow: "hidden" }}>
        <ImageBackground source={PATTERN_BG} imageStyle={{ opacity: 0.04, resizeMode: "cover" }}>
          {category.services.map(service => renderServiceItem(service, category))}
        </ImageBackground>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.pageBg }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* App Bar (64dp) */}
      <AppHeader
        title="Public Services"
        subtitle="ZRP Digital Services Directory"
        rightActions={[
          {
            iconName: "search-outline",
            onPress: () => setShowSearch(!showSearch),
          },
        ]}
      />

      {/* Search Bar (56dp) */}
      {showSearch && (
        <View style={{ paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.component, backgroundColor: colors.neutral.white, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ height: componentHeights.search, borderRadius: radius.input, backgroundColor: colors.sectionBg, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.cardSpacing, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name="search" size={20} color={colors.neutral[500]} style={{ marginRight: 10 }} />
            <TextInput
              style={{ flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 }}
              placeholder="Search services..."
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Filters Section - Inline */}
      <View className="bg-white border-b border-gray-200">
        <View className="px-4 pt-3">
          <Text className="text-sm font-bold text-blue-900 mb-2">Filter Services</Text>
          
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
            {serviceCategories.map((cat) => (
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

          {/* Availability Filters */}
          <View className="flex-row mb-3">
            {[
              { key: "all", label: "All Services" },
              { key: "available", label: "Available Now" },
              { key: "coming_soon", label: "Coming Soon" },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.key}
                className={`flex-1 mx-1 px-3 py-2 rounded-lg ${filterByAvailability === opt.key ? 'bg-blue-50 border border-blue-200' : 'bg-gray-100 border border-gray-200'}`}
                onPress={() => setFilterByAvailability(opt.key)}
              >
                <View className="flex-row items-center justify-center">
                  <Text className={`text-sm ${filterByAvailability === opt.key ? 'text-blue-900 font-semibold' : 'text-gray-600'}`}>
                    {opt.label}
                  </Text>
                  {filterByAvailability === opt.key && (
                    <Ionicons name="checkmark" size={16} color="#1E3A8A" className="ml-1" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Active Filters Display */}
        {(selectedCategory !== "all" || filterByAvailability !== "all" || searchQuery) && (
          <View className="px-4 pb-3">
            <Text className="text-xs font-medium text-gray-500 mb-1">Active Filters:</Text>
            <View className="flex-row flex-wrap">
              {selectedCategory !== "all" && (
                <View className="flex-row items-center bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                  <Text className="text-xs font-medium text-blue-900 mr-1">
                    Category: {serviceCategories.find(c => c.id === selectedCategory)?.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedCategory("all")}>
                    <Ionicons name="close" size={12} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>
              )}
              {filterByAvailability !== "all" && (
                <View className="flex-row items-center bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                  <Text className="text-xs font-medium text-blue-900 mr-1">
                    {filterByAvailability === "available" ? "Available Now" : "Coming Soon"}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterByAvailability("all")}>
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
                  setFilterByAvailability("all");
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
              <Text className="text-base font-bold text-blue-900">
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
              {searchQuery || selectedCategory !== "all" || filterByAvailability !== "all"
                ? "Try adjusting your search or filters"
                : "No services available"}
            </Text>
            {(searchQuery || selectedCategory !== "all" || filterByAvailability !== "all") && (
              <TouchableOpacity 
                className="px-5 py-2.5 bg-gray-50 rounded-lg border border-gray-300"
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setFilterByAvailability("all");
                }}
              >
                <Text className="text-sm font-semibold text-blue-900">Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Follow Us Section */}
        <View className="bg-white mt-2 px-4 py-5 border-b border-gray-200">
          <Text className="text-base font-bold text-blue-900 mb-4">Follow ZRP</Text>
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
          <Text className="text-base font-bold text-blue-900 mb-4">Quick Links</Text>
          <View className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            {[
              { icon: "call", label: "Emergency Contacts", route: "/emergency-contacts" },
              { icon: "location", label: "Police Stations Map", route: "/maps" },
              { icon: "newspaper", label: "Latest News", route: "/press-release" },
              { icon: "information-circle", label: "About SafeTap", route: "/about" },
            ].map((link, index) => (
              <TouchableOpacity 
                key={index}
                className={`flex-row items-center px-4 py-4 ${index < 3 ? 'border-b border-gray-200' : ''}`}
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

      {/* Coming Soon Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showComingSoonModal}
        onRequestClose={() => setShowComingSoonModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-5">
          <View className="bg-white rounded-xl p-6 w-full max-w-sm items-center">
            <View className="w-20 h-20 rounded-full bg-yellow-100 justify-center items-center mb-4">
              <Ionicons name="time" size={36} color="#F59E0B" />
            </View>
            
            <Text className="text-xl font-bold text-gray-900 mb-3">Coming Soon</Text>
            
            <Text className="text-sm text-gray-600 text-center mb-2 leading-5">
              {comingSoonTitle} service is currently in development and will be available soon.
            </Text>
            
            <Text className="text-xs text-gray-500 text-center mb-6">
              We're working hard to bring you this feature.
            </Text>
            
            <TouchableOpacity
              className="w-full py-3 bg-blue-900 rounded-lg items-center"
              onPress={() => setShowComingSoonModal(false)}
            >
              <Text className="text-sm font-semibold text-white">Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  serviceRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  serviceItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  serviceIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serviceTitleText: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  serviceSubText: {
    fontSize: 12,
  },
  soonTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    marginRight: 8,
  },
  soonTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
});

export default Services;