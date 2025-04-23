import { View } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

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
          height: 50,
          borderRadius: 15,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
          borderTopWidth: 0,
          paddingHorizontal: 10,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { 
          fontSize: 10, 
          fontWeight: '200'
        },
      }}
    >
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name='podium-sharp' 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'} 
            />
          )
        }}
      />
    
      <Tabs.Screen 
        name="contacts" 
        options={{ 
          title: 'Contacts',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name='call' 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'} 
            />
          )
        }}
      />

      <Tabs.Screen 
        name="sos" 
        options={{ 
          title: '',
          tabBarIcon: ({ focused }) => (
            <View style={{
              position: 'absolute',
              bottom: 4,
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#ef4444',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
           
              elevation: 2,
            }}>
              <Ionicons 
                name='alert' 
                size={30} 
                color='white' 
              />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
   <Tabs.Screen 
        name="reports" 
        options={{ 
          title: 'Reports',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name='warning' 
              size={24} 
              color={focused ? '#2563eb' : '#64748b'} 
            />
          )
        }}
      />

      <Tabs.Screen 
        name="about" 
        options={{ 
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <Ionicons 
              name='menu' 
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