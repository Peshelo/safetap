import React, { useEffect, useRef, useState } from "react";
import { Animated, Modal, PanResponder, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SmoothBottomSheet({ visible, onClose, children, contentStyle }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(700)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const close = () => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 700, tension: 50, friction: 12, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      onClose?.();
    });
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.spring(translateY, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
          Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
      });
    } else if (mounted) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 700, tension: 50, friction: 12, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 100 || gesture.vy > 0.8) close();
      else Animated.spring(translateY, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }).start(),
  })).current;

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <TouchableWithoutFeedback onPress={close}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
        <Animated.View style={[styles.sheet, contentStyle, { paddingBottom: insets.bottom, transform: [{ translateY }] }]}>
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.48)" },
  sheet: {
    maxHeight: "90%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 18, borderTopRightRadius: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 16,
  },
  handleArea: { height: 30, alignItems: "center", justifyContent: "center" },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1" },
});
