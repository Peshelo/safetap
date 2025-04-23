import { View, Text, TouchableOpacity } from 'react-native';
import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const Reports = () => {
    const router = useRouter();
    const emergencyTypes = [
        { id: 1, title: "Fire", icon: "flame", iconSet: 'Ionicons', color: "#f97316" },
        { id: 2, title: "Medical Emergency", icon: "medical-bag", iconSet: 'MaterialCommunityIcons', color: "#22c55e" },
        { id: 3, title: "Crime", icon: "handcuffs", iconSet: 'MaterialCommunityIcons', color: "#ef4444" },
        { id: 4, title: "Accident", icon: "car-crash", iconSet: 'FontAwesome5', color: "#eab308" },
        { id: 5, title: "Natural Disaster", icon: "weather-hurricane", iconSet: 'MaterialCommunityIcons', color: "#8b5cf6" },
        { id: 6, title: "Domestic Violence", icon: "home-heart", iconSet: 'MaterialCommunityIcons', color: "#ec4899" },
        { id: 7, title: "Suspicious Activity", icon: "eye", iconSet: 'Ionicons', color: "#0ea5e9" },
        { id: 8, title: "Theft", icon: "shopping-bag", iconSet: 'FontAwesome5', color: "#f59e0b" },
        { id: 9, title: "Lost Item", icon: "help-circle", iconSet: 'Ionicons', color: "#b45309" },
        { id: 10, title: "Traffic Violation", icon: "traffic-light", iconSet: 'MaterialCommunityIcons', color: "#dc2626" },
    ];

    const handleReport = (report) => {
        router.push(`/report/${report.title}` )
    }

    const renderIcon = (iconSet, iconName, color) => {
        switch(iconSet) {
            case 'Ionicons':
                return <Ionicons name={iconName} size={24} color={color} />;
            case 'MaterialCommunityIcons':
                return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
            case 'FontAwesome5':
                return <FontAwesome5 name={iconName} size={20} color={color} />;
            default:
                return <Ionicons name={iconName} size={24} color={color} />;
        }
    }

    return (
        <GestureHandlerRootView className="flex-1 bg-gray-50">
            <Stack.Screen options={{ 
                title: "Report a Case",
                headerTitleStyle: {
                    fontWeight: '600',
                    fontSize: 18
                },
                headerShown: true,
            }} />
            
            <View className="p-4">
                <Text className="text-lg px-2 text-gray-600 mb-4">Select the type of emergency</Text>
                
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
                                        style={{ backgroundColor: emergency.color + '20' }}
                                    >
                                        {renderIcon(emergency.iconSet, emergency.icon, emergency.color)}
                                    </View>
                                    <Text className="text-base font-medium text-gray-900">
                                        {emergency.title}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </View>
        </GestureHandlerRootView>
    )
}

export default Reports;