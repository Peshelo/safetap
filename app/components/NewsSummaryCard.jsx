import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import pb from "../../lib/connection";

const NewsSummaryCard = ({ item, onPress }) => {
  const getFileUrl = (item) => {
    if (!item.file) return null;
    return pb.files.getURL(item, item.file);
  };

  const fileUrl = getFileUrl(item);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress?.(item)}>
      {fileUrl ? (
        <Image source={{ uri: fileUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]} />
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text style={styles.description} numberOfLines={1}>
            {item.description.replace(/<[^>]*>/g, "")}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text style={styles.metaText}>{formatDate(item.created)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: "#F3F4F6",
  },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#6B7280",
  },
});

export default NewsSummaryCard;
