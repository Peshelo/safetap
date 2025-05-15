import { View } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons'

const RootLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: 'white',
          position: 'absolute',
          bottom: 0,
          left: 20,
          right: 20,
          height: 60,  // Increased height for better touch area
          borderRadius: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          borderTopWidth: 0,
          paddingHorizontal: 10,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { 
          fontSize: 12,  // Slightly larger font
          fontWeight: '500',  // Medium weight for better readability
          paddingBottom: 4,  // Better spacing
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? 'albums' : 'albums-outline'} 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'} 
            />
          )
        }}
      />
    
      <Tabs.Screen 
        name="contacts" 
        options={{ 
          title: 'Stations',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'call' : 'call-outline'} 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'}
            />
          )
        }}
      />

      {/* <Tabs.Screen 
        name="sos"
         
        options={{ 
          title: 'SOS',
        
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 60,
              height: 60,
              bottom: 10,
              borderRadius: 10,
              backgroundColor: '#ef4444',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}>
              <FontAwesome5 
                name='exclamation-triangle' 
                size={24} 
                color='white' 
              />
            </View>
          ),
        }}
      /> */}
         <Tabs.Screen 
        name="trackcase" 
        options={{ 
          title: 'Track Case',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'} 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'}
            />
          )
        }}
      />
      <Tabs.Screen 
        name="reports" 
        options={{ 
          title: 'Reports',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'} 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'}
            />
          )
        }}
      />
 

      <Tabs.Screen 
        name="about" 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'} 
            />
          )
        }}
      />
    </Tabs>
  )
}

export default RootLayout