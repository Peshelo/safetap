import React from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

/**
 * Offline-capable, dynamic QR code component for Expo / React Native.
 * Uses react-native-qrcode-svg to generate vector QR codes in-memory on device.
 * Operates 100% offline with zero network requests.
 */
export default function OfflineQRCode({ value, size = 220, color = '#0F172A', backgroundColor = '#FFFFFF' }) {
  if (!value) return null;

  return (
    <View style={{ padding: 12, backgroundColor, borderRadius: 12 }}>
      <QRCode
        value={value}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        ecl="M"
      />
    </View>
  );
}
