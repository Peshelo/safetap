import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import pb from "../../lib/connection";

const NewsSummaryCard = ({ item, onPress, showDescription = true }) => {
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

  // Fallback image source
  const fallbackImage = require("../../assets/images/fallback.png");

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(item)} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image 
          source={fileUrl ? { uri: fileUrl } : fallbackImage} 
          style={styles.image}
          defaultSource={fallbackImage}
        />
      </View>
      
      <View style={styles.content}>
        <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={styles.date}>{item.created}</Text>
          </View>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          
        </View>
        
        {showDescription && item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description.replace(/<[^>]*>/g, "")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "transparent",
    // borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  imageContainer: {
    width: "100%",
    height: 160,
    overflow: "hidden",
      borderWidth:0.5,
    borderColor:"lightgray",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    boxShadow: 'black',


    borderRadius:5,
  },
  content: {
    padding: 16,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "column",
    // justifyContent: "space-between",
    // alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 20,
    marginRight: 12,
  },
  dateContainer: {
    // flexDirection: "row",
    // alignItems: "center",
    // gap: 4,
    // backgroundColor: "#F9FAFB",
    // paddingHorizontal: 8,
    // paddingVertical: 4,
    // borderRadius: 6,
    // borderWidth: 0.5,
    // borderColor: "#E5E7EB",
  },
  date: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
});

export default NewsSummaryCard;