import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { FontAwesome5, Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Contacts from 'expo-contacts';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter } from "expo-router";

// Fixed JSON data for emergency contacts in Zimbabwe
const emergencyContactsData = {
  "Police & Security": [
    {
      id: "1",
      name: "Emergency Police",
      number: "995",
      description: "National Police Emergency",
      isTollFree: true,
      category: "Police & Security",
      icon: "police-badge",
      color: "#1E3A8A",
    },
    {
      id: "2",
      name: "Police General Line",
      number: "024-2777777",
      description: "Police General Inquiries",
      isTollFree: false,
      category: "Police & Security",
      icon: "shield-check",
      color: "#1E40AF",
    },
    {
      id: "3",
      name: "CID Anti-Corruption",
      number: "024-2703631",
      description: "Corruption Reporting",
      isTollFree: false,
      category: "Police & Security",
      icon: "account-alert",
      color: "#1E3A8A",
    },
    {
      id: "4",
      name: "Zimbabwe Republic Police",
      number: "024-2703631",
      description: "Police Headquarters",
      isTollFree: false,
      category: "Police & Security",
      icon: "badge-account",
      color: "#1E40AF",
    },
  ],
  
  "Medical & Ambulance": [
    {
      id: "5",
      name: "Emergency Ambulance",
      number: "994",
      description: "National Ambulance Service",
      isTollFree: true,
      category: "Medical & Ambulance",
      icon: "ambulance",
      color: "#DC2626",
    },
    {
      id: "6",
      name: "Medical Emergency",
      number: "112",
      description: "Medical Emergency Services",
      isTollFree: true,
      category: "Medical & Ambulance",
      icon: "hospital-box",
      color: "#DC2626",
    },
    {
      id: "7",
      name: "COVID-19 Hotline",
      number: "2019",
      description: "COVID-19 Information",
      isTollFree: true,
      category: "Medical & Ambulance",
      icon: "virus",
      color: "#059669",
    },
    {
      id: "8",
      name: "Red Cross",
      number: "0772-235235",
      description: "Zimbabwe Red Cross Society",
      isTollFree: false,
      category: "Medical & Ambulance",
      icon: "cross",
      color: "#DC2626",
    },
  ],
  
  "Fire & Rescue": [
    {
      id: "9",
      name: "Fire & Rescue",
      number: "993",
      description: "National Fire Brigade",
      isTollFree: true,
      category: "Fire & Rescue",
      icon: "fire-truck",
      color: "#EA580C",
    },
    {
      id: "10",
      name: "Civil Protection",
      number: "026-2124491",
      description: "Disaster Management",
      isTollFree: false,
      category: "Fire & Rescue",
      icon: "alert-octagon",
      color: "#EA580C",
    },
  ],
  
  "Electricity & Utilities": [
    {
      id: "11",
      name: "ZESA Emergency",
      number: "029-2274581",
      description: "Power Outage Emergency",
      isTollFree: false,
      category: "Electricity & Utilities",
      icon: "flash",
      color: "#F59E0B",
    },
    {
      id: "12",
      name: "ZETDC Hotline",
      number: "0800-2211",
      description: "Electricity Distribution",
      isTollFree: true,
      category: "Electricity & Utilities",
      icon: "lightning-bolt",
      color: "#F59E0B",
    },
  ],
  
  "Water & Sanitation": [
    {
      id: "13",
      name: "ZINWA Emergency",
      number: "024-2773044",
      description: "Water Supply Emergency",
      isTollFree: false,
      category: "Water & Sanitation",
      icon: "water",
      color: "#0284C7",
    },
    {
      id: "14",
      name: "City of Harare Water",
      number: "0772-222111",
      description: "Harare Water Department",
      isTollFree: false,
      category: "Water & Sanitation",
      icon: "pipe",
      color: "#0284C7",
    },
  ],
  
  "Road & Traffic": [
    {
      id: "15",
      name: "Vehicle Theft",
      number: "0772-333444",
      description: "Stolen Vehicle Reporting",
      isTollFree: false,
      category: "Road & Traffic",
      icon: "car-brake-alert",
      color: "#7C3AED",
    },
    {
      id: "16",
      name: "Traffic Safety Council",
      number: "0772-456789",
      description: "Road Safety Inquiries",
      isTollFree: false,
      category: "Road & Traffic",
      icon: "traffic-light",
      color: "#7C3AED",
    },
  ],
  
  "Helplines & Support": [
    {
      id: "17",
      name: "Childline Zimbabwe",
      number: "116",
      description: "Child Protection Helpline",
      isTollFree: true,
      category: "Helplines & Support",
      icon: "heart-outline",
      color: "#DB2777",
    },
    {
      id: "18",
      name: "Gender-Based Violence",
      number: "0808-0193",
      description: "GBV Support Hotline",
      isTollFree: true,
      category: "Helplines & Support",
      icon: "shield-account",
      color: "#DB2777",
    },
    {
      id: "19",
      name: "Mental Health Support",
      number: "0800-1234",
      description: "Mental Health Counseling",
      isTollFree: true,
      category: "Helplines & Support",
      icon: "brain",
      color: "#8B5CF6",
    },
  ],
  
  "Embassies & Consulates": [
    {
      id: "20",
      name: "US Embassy",
      number: "024-235-0000",
      description: "United States Embassy",
      isTollFree: false,
      category: "Embassies & Consulates",
      icon: "flag",
      color: "#374151",
    },
    {
      id: "21",
      name: "UK Embassy",
      number: "024-285-4880",
      description: "British Embassy",
      isTollFree: false,
      category: "Embassies & Consulates",
      icon: "flag-outline",
      color: "#374151",
    },
  ],
};

const ALL_CATEGORIES = Object.keys(emergencyContactsData);
const FAVORITES_KEY = "emergency_favorites";
const USER_CONTACTS_KEY = "emergency_user_contacts";

const AllEmergencyContacts = () => {
  const navigation = useNavigation();
    const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [favorites, setFavorites] = useState([]);
  const [userContacts, setUserContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactNumber, setNewContactNumber] = useState("");
  const [newContactCategory, setNewContactCategory] = useState("Personal");
  const [showImportContacts, setShowImportContacts] = useState(false);
  const [phoneContacts, setPhoneContacts] = useState([]);
  const [selectedPhoneContacts, setSelectedPhoneContacts] = useState([]);

  useEffect(() => {
    loadFavorites();
    loadUserContacts();
  }, []);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const loadUserContacts = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem(USER_CONTACTS_KEY);
      if (storedContacts) {
        setUserContacts(JSON.parse(storedContacts));
      }
    } catch (error) {
      console.error("Error loading user contacts:", error);
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  const saveUserContacts = async (newContacts) => {
    try {
      await AsyncStorage.setItem(USER_CONTACTS_KEY, JSON.stringify(newContacts));
      setUserContacts(newContacts);
    } catch (error) {
      console.error("Error saving user contacts:", error);
    }
  };

  const toggleFavorite = (contact) => {
    const isFavorite = favorites.some(fav => fav.id === contact.id && fav.type === contact.type);
    let newFavorites;
    
    if (isFavorite) {
      newFavorites = favorites.filter(fav => !(fav.id === contact.id && fav.type === contact.type));
    } else {
      newFavorites = [...favorites, { ...contact, type: contact.type || 'emergency' }];
    }
    
    saveFavorites(newFavorites);
  };

  const isFavorite = (contact) => {
    return favorites.some(fav => fav.id === contact.id && fav.type === (contact.type || 'emergency'));
  };

  const handleCall = (number) => {
    const phoneNumber = `tel:${number}`;
    Linking.openURL(phoneNumber).catch(err => {
      Alert.alert("Error", "Could not make the call. Please check your device settings.");
    });
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactNumber.trim()) {
      Alert.alert("Error", "Please enter both name and number");
      return;
    }

    const newContact = {
      id: `user_${Date.now()}`,
      name: newContactName.trim(),
      number: newContactNumber.trim(),
      description: "Personal Emergency Contact",
      isTollFree: false,
      category: newContactCategory,
      icon: "account-plus",
      color: "#059669",
      type: "personal"
    };

    const updatedContacts = [...userContacts, newContact];
    saveUserContacts(updatedContacts);
    
    setNewContactName("");
    setNewContactNumber("");
    setNewContactCategory("Personal");
    setShowAddContact(false);
    
    Alert.alert("Success", "Contact added successfully!");
  };

  const deleteUserContact = (contactId) => {
    Alert.alert(
      "Delete Contact",
      "Are you sure you want to delete this contact?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedContacts = userContacts.filter(contact => contact.id !== contactId);
            saveUserContacts(updatedContacts);
          }
        }
      ]
    );
  };

  const loadPhoneContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        });

        if (data.length > 0) {
          setPhoneContacts(data);
          setShowImportContacts(true);
        } else {
          Alert.alert("No Contacts", "No contacts found on your device.");
        }
      } else {
        Alert.alert("Permission Denied", "Contacts permission is required to import contacts.");
      }
    } catch (error) {
      console.error("Error loading contacts:", error);
      Alert.alert("Error", "Failed to load contacts from your device.");
    }
  };

  const toggleSelectPhoneContact = (contact) => {
    setSelectedPhoneContacts(prev => {
      const isSelected = prev.some(c => c.id === contact.id);
      if (isSelected) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const importSelectedContacts = () => {
    const contactsToAdd = selectedPhoneContacts.map(contact => ({
      id: `imported_${contact.id}`,
      name: contact.name,
      number: contact.phoneNumbers?.[0]?.number || "No number",
      description: "Imported from phone",
      isTollFree: false,
      category: "Personal",
      icon: "account",
      color: "#059669",
      type: "imported"
    }));

    const updatedContacts = [...userContacts, ...contactsToAdd];
    saveUserContacts(updatedContacts);
    
    setSelectedPhoneContacts([]);
    setShowImportContacts(false);
    setPhoneContacts([]);
    
    Alert.alert("Success", `${contactsToAdd.length} contacts imported successfully!`);
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Prepare data for display
  const getFilteredData = () => {
    let allContacts = [];
    
    // Add user contacts first
    if (userContacts.length > 0) {
      allContacts.push({
        category: "My Contacts",
        data: userContacts,
        isUserSection: true
      });
    }
    
    // Add favorites if they exist
    if (favorites.length > 0 && selectedCategory === "All") {
      allContacts.push({
        category: "Favorites",
        data: favorites,
        isFavoriteSection: true
      });
    }
    
    // Add emergency contacts by category
    Object.entries(emergencyContactsData).forEach(([category, contacts]) => {
      if (selectedCategory === "All" || selectedCategory === category) {
        let filteredContacts = contacts;
        
        // Apply search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredContacts = contacts.filter(contact =>
            contact.name.toLowerCase().includes(term) ||
            contact.description.toLowerCase().includes(term) ||
            contact.number.includes(term)
          );
        }
        
        if (filteredContacts.length > 0) {
          allContacts.push({
            category,
            data: filteredContacts,
            isEmergencySection: true
          });
        }
      }
    });
    
    return allContacts;
  };

  const renderContactItem = ({ item, section }) => {
    const favorite = isFavorite(item);
    
    return (
      <TouchableOpacity
        style={styles.contactCard}
        onPress={() => handleCall(item.number)}
        activeOpacity={0.7}
      >
        <View style={styles.contactLeft}>
          <View style={[styles.contactIcon, { backgroundColor: item.color + '20' }]}>
            <MaterialCommunityIcons 
              name={item.icon} 
              size={24} 
              color={item.color} 
            />
          </View>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isTollFree && (
                <View style={styles.tollFreeBadge}>
                  <Text style={styles.tollFreeText}>TOLL FREE</Text>
                </View>
              )}
            </View>
            
            <Text style={styles.contactNumber} numberOfLines={1}>
              {item.number}
            </Text>
            
            <Text style={styles.contactDescription} numberOfLines={1}>
              {item.description}
            </Text>
          </View>
        </View>
        
        <View style={styles.contactActions}>
          {section.isUserSection && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteUserContact(item.id)}
            >
              <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => toggleFavorite(item)}
          >
            <MaterialIcons 
              name={favorite ? "star" : "star-outline"} 
              size={24} 
              color={favorite ? "#F59E0B" : "#9CA3AF"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(item.number)}
          >
            <MaterialIcons name="call" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => {
    const isExpanded = expandedCategories[section.category] !== false;
    
    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleCategory(section.category)}
        activeOpacity={0.6}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(section.category) + '20' }]}>
            <MaterialCommunityIcons 
              name={getCategoryIcon(section.category)} 
              size={20} 
              color={getCategoryColor(section.category)} 
            />
          </View>
          <Text style={styles.sectionTitle}>{section.category}</Text>
          <Text style={styles.sectionCount}>({section.data.length})</Text>
        </View>
        
        <MaterialIcons 
          name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={24} 
          color="#6B7280" 
        />
      </TouchableOpacity>
    );
  };

  const getCategoryIcon = (category) => {
    const icons = {
      "My Contacts": "account-group",
      "Favorites": "star-circle",
      "Police & Security": "shield-check",
      "Medical & Ambulance": "medical-bag",
      "Fire & Rescue": "fire",
      "Electricity & Utilities": "flash",
      "Water & Sanitation": "water",
      "Road & Traffic": "car",
      "Helplines & Support": "lifebuoy",
      "Embassies & Consulates": "flag",
      "Personal": "account",
    };
    return icons[category] || "phone";
  };

  const getCategoryColor = (category) => {
    const colors = {
      "My Contacts": "#059669",
      "Favorites": "#F59E0B",
      "Police & Security": "#1E3A8A",
      "Medical & Ambulance": "#DC2626",
      "Fire & Rescue": "#EA580C",
      "Electricity & Utilities": "#F59E0B",
      "Water & Sanitation": "#0284C7",
      "Road & Traffic": "#7C3AED",
      "Helplines & Support": "#DB2777",
      "Embassies & Consulates": "#374151",
      "Personal": "#059669",
    };
    return colors[category] || "#6B7280";
  };

  const renderImportContactsModal = () => {
    if (!showImportContacts) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contacts to Import</Text>
            <TouchableOpacity onPress={() => setShowImportContacts(false)}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contactsList}>
            {phoneContacts.map(contact => {
              const isSelected = selectedPhoneContacts.some(c => c.id === contact.id);
              const phoneNumber = contact.phoneNumbers?.[0]?.number || "No number";
              
              return (
                <TouchableOpacity
                  key={contact.id}
                  style={[
                    styles.phoneContactItem,
                    isSelected && styles.phoneContactItemSelected
                  ]}
                  onPress={() => toggleSelectPhoneContact(contact)}
                >
                  <View style={styles.phoneContactInfo}>
                    <Text style={styles.phoneContactName}>{contact.name}</Text>
                    <Text style={styles.phoneContactNumber}>{phoneNumber}</Text>
                  </View>
                  <MaterialIcons 
                    name={isSelected ? "check-circle" : "radio-button-unchecked"} 
                    size={24} 
                    color={isSelected ? "#059669" : "#9CA3AF"} 
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => {
                setSelectedPhoneContacts([]);
                setShowImportContacts(false);
                setPhoneContacts([]);
              }}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButtonPrimary,
                selectedPhoneContacts.length === 0 && styles.modalButtonDisabled
              ]}
              onPress={importSelectedContacts}
              disabled={selectedPhoneContacts.length === 0}
            >
              <Text style={styles.modalButtonTextPrimary}>
                Import ({selectedPhoneContacts.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const filteredData = getFilteredData();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#718096" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search emergency contacts..."
              placeholderTextColor="#a0aec0"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={20} color="#cbd5e0" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Category Filter */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryFilter}
        >
          <TouchableOpacity
            style={[
              styles.categoryPill,
              selectedCategory === "All" && styles.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory("All")}
          >
            <Text style={[
              styles.categoryPillText,
              selectedCategory === "All" && styles.categoryPillTextActive,
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          {ALL_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryPill,
                selectedCategory === category && styles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryPillText,
                selectedCategory === category && styles.categoryPillTextActive,
              ]}>
                {category.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add Contact Buttons */}
        <View style={styles.addContactContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddContact(true)}
          >
            <MaterialIcons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Contact</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.importButton}
            onPress={loadPhoneContacts}
          >
            <MaterialIcons name="import-contacts" size={20} color="#1E3A8A" />
            <Text style={styles.importButtonText}>Import Contacts</Text>
          </TouchableOpacity>
        </View>

        {/* Contacts List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="contact-phone" size={48} color="#cbd5e0" />
            <Text style={styles.emptyTitle}>No contacts found</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? "Try adjusting your search" : "Add your first emergency contact"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item, index) => `${item.category}_${index}`}
            renderItem={({ item: section }) => {
              const isExpanded = expandedCategories[section.category] !== false;
              
              if (!isExpanded) {
                return (
                  <>
                    {renderSectionHeader({ section })}
                    <View style={styles.collapsedSection}>
                      <Text style={styles.collapsedText}>
                        {section.data.length} contacts collapsed
                      </Text>
                    </View>
                  </>
                );
              }
              
              return (
                <>
                  {renderSectionHeader({ section })}
                  {section.data.map((contact, index) => (
                    <View key={`${contact.id}_${index}`}>
                      {renderContactItem({ item: contact, section })}
                    </View>
                  ))}
                </>
              );
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Add Contact Modal */}
      {showAddContact && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity onPress={() => setShowAddContact(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Contact Name"
              placeholderTextColor="#9CA3AF"
              value={newContactName}
              onChangeText={setNewContactName}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              placeholderTextColor="#9CA3AF"
              value={newContactNumber}
              onChangeText={setNewContactNumber}
              keyboardType="phone-pad"
            />
            
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {["Personal", "Family", "Work", "Medical", "Security"].map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    newContactCategory === category && styles.categoryOptionActive,
                  ]}
                  onPress={() => setNewContactCategory(category)}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    newContactCategory === category && styles.categoryOptionTextActive,
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowAddContact(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleAddContact}
              >
                <Text style={styles.modalButtonTextPrimary}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Import Contacts Modal */}
      {renderImportContactsModal()}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#1E3A8A",
    paddingTop: 50,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2d3748",
    paddingVertical: 8,
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f7fafc",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryPillActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  categoryPillText: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "500",
  },
  categoryPillTextActive: {
    color: "#fff",
  },
  addContactContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E3A8A",
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  importButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E3A8A",
    marginLeft: 8,
  },
  importButtonText: {
    color: "#1E3A8A",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginTop: 8,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2d3748",
  },
  sectionCount: {
    fontSize: 14,
    color: "#718096",
    marginLeft: 6,
  },
  collapsedSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  collapsedText: {
    fontSize: 12,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  contactCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  contactLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2d3748",
    flex: 1,
  },
  tollFreeBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  tollFreeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  contactNumber: {
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: "500",
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 12,
    color: "#718096",
  },
  contactActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButton: {
    padding: 4,
    marginRight: 4,
  },
  favoriteButton: {
    padding: 4,
    marginRight: 8,
  },
  callButton: {
    backgroundColor: "#10B981",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#718096",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4a5568",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#a0aec0",
    textAlign: "center",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#374151",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryOptionActive: {
    backgroundColor: "#1E3A8A",
    borderColor: "#1E3A8A",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryOptionTextActive: {
    color: "#FFFFFF",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  modalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#1E3A8A",
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 8,
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  contactsList: {
    maxHeight: 300,
  },
  phoneContactItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  phoneContactItemSelected: {
    backgroundColor: "#F0F9FF",
  },
  phoneContactInfo: {
    flex: 1,
  },
  phoneContactName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  phoneContactNumber: {
    fontSize: 14,
    color: "#6B7280",
  },
});

export default AllEmergencyContacts;