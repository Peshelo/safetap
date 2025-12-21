import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import pb from "../../lib/connection";

const NewsCard = ({
  item,
  onPress,
  showDescription = false,
  showTag = true,
  showFooter = true,
  cardStyle = {},
  compact = false,
  showPreviewButton = false,
}) => {
  const getFileUrl = (item) => {
    if (!item.file) return null;
    return pb.getFileUrl(item, item.file);
  };

  const getFileType = (url) => {
    if (!url) return null;
    const extension = url.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
    if (extension === "pdf") return "pdf";
    return null;
  };

  const fileUrl = getFileUrl(item);
  const fileType = getFileType(fileUrl);
  const hasFile = !!item.file;

  const getHumanFriendlyDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) {
      return "Just now";
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      if (date.getDate() === now.getDate()) {
        return "Today";
      } else {
        return "Yesterday";
      }
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => onPress?.(item)}
        style={[styles.compactCardContainer, cardStyle]}
        activeOpacity={0.7}
      >
        <View style={styles.compactCard}>
          <View style={styles.compactCardHeader}>
            <View style={styles.compactIconContainer}>
              {hasFile ? (
                fileType === "image" ? (
                  <Image
                    source={{ uri: fileUrl }}
                    style={styles.compactThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="document" size={16} color="#3b82f6" />
                )
              ) : (
                <Ionicons name="document-text" size={16} color="#3b82f6" />
              )}
            </View>
            <View style={styles.compactCardContent}>
              <Text style={styles.compactTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.compactMeta}>
                <Ionicons name="time-outline" size={12} color="#6b7280" />
                <Text style={styles.compactDate}>
                  {getHumanFriendlyDate(item.created)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      style={[styles.cardContainer, cardStyle]}
      activeOpacity={0.7}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            {hasFile ? (
              fileType === "image" ? (
                <Image
                  source={{ uri: fileUrl }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="document" size={24} color="#3b82f6" />
              )
            ) : (
              <Ionicons name="document-text" size={24} color="#3b82f6" />
            )}
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.metaContainer}>
              <Ionicons name="time-outline" size={14} color="#6b7280" />
              <Text style={styles.dateText}>
                {getHumanFriendlyDate(item.created)}
              </Text>
            </View>
          </View>
        </View>

        {showDescription && item.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description} numberOfLines={3}>
              {item.description.replace(/<[^>]*>/g, "")}
            </Text>
          </View>
        )}

        {hasFile && (
          <View style={styles.filePreviewContainer}>
            <Ionicons
              name={fileType === "image" ? "image-outline" : "document-outline"}
              size={14}
              color="#6b7280"
            />
            <Text style={styles.filePreviewText}>
              {fileType === "image" ? "Image" : "PDF Document"} attached
            </Text>
          </View>
        )}

        {showFooter && (
          <View style={styles.cardFooter}>
            {showTag && (
              <View style={styles.tagContainer}>
                <Text style={styles.tag}>Press Release</Text>
              </View>
            )}

            {/* {showPreviewButton && (
              <TouchableOpacity
                style={styles.previewButton}
                onPress={() => onPress?.(item)}
              >
                <Text style={styles.previewButtonText}>Preview</Text>
                <Ionicons name="eye-outline" size={14} color="#3b82f6" />
              </TouchableOpacity>
            )}

            {!showPreviewButton && (
              <View style={styles.cardActions}>
                <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
              </View>
            )} */}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Standard Card Styles
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  cardHeaderText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 22,
    marginBottom: 4,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  filePreviewContainer: {
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filePreviewText: {
    fontSize: 13,
    color: "#4b5563",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tagContainer: {
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tag: {
    fontSize: 11,
    color: "#0284c7",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  previewButtonText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
  },

  // Compact Card Styles
  compactCardContainer: {
    marginBottom: 8,
  },
  compactCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  compactCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  compactThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  compactCardContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
    marginBottom: 2,
  },
  compactMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactDate: {
    fontSize: 11,
    color: "#6b7280",
  },
});

export default NewsCard;
