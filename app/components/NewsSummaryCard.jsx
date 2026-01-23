import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import React from "react";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import pb from "../../lib/connection";

const NewsSummaryCard = ({
  item,
  onPress,
  showDescription = false,
  showTag = true,
  showFooter = true,
  cardStyle = {},
  compact = false,
  showPreviewButton = false,
  showImage = true,
  showDate = true,
}) => {
  const getFileUrl = (item) => {
    if (!item.file) return null;
    return pb.files.getURL(item, item.file);
  };

  const getFileType = (url) => {
    if (!url) return null;
    const extension = url.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) return "image";
    if (extension === "pdf") return "pdf";
    return null;
  };

  const fileUrl = getFileUrl(item);
  const fileType = getFileType(fileUrl);
  const hasFile = !!item.file;

  const getHumanFriendlyDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));

      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Recently";
    }
  };

  const formatDescription = (text) => {
    if (!text) return "";
    // Remove HTML tags and trim
    const cleanText = text.replace(/<[^>]*>/g, "").trim();
    // Limit to 100 characters for preview
    if (cleanText.length > 100) {
      return cleanText.substring(0, 100) + "...";
    }
    return cleanText;
  };

  // If compact mode is enabled
  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => onPress?.(item)}
        style={[styles.compactCard, cardStyle]}
        activeOpacity={0.7}
      >
        {hasFile && fileType === "image" && showImage && (
          <Image
            source={{ uri: fileUrl }}
            style={styles.compactImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.compactContent}>
          {showTag && (
            <View style={styles.tagContainer}>
              <Text style={styles.tagText}>NEWS</Text>
            </View>
          )}
          <Text style={styles.compactTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {showDate && (
            <View style={styles.metaRow}>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <Text style={styles.metaText}>
                  {getHumanFriendlyDate(item.created)}
                </Text>
              </View>
              {item.description && (
                <Text style={styles.previewText} numberOfLines={1}>
                  {formatDescription(item.description)}
                </Text>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Standard article card for homepage
  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      style={[styles.card, cardStyle]}
      activeOpacity={0.7}
    >
      {/* Article Image */}
      {hasFile && fileType === "image" && showImage && (
        <Image
          source={{ uri: fileUrl }}
          style={styles.articleImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.cardContent}>
        {/* Article Header */}
        <View style={styles.cardHeader}>
          {showTag && (
            <View style={styles.articleTag}>
              <Text style={styles.articleTagText}>NEWS</Text>
            </View>
          )}
          {showDate && (
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.dateText}>
                {getHumanFriendlyDate(item.created)}
              </Text>
            </View>
          )}
        </View>

        {/* Article Title */}
        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Article Preview */}
        {item.description && (
          <Text style={styles.articlePreview} numberOfLines={2}>
            {formatDescription(item.description)}
          </Text>
        )}

        {/* Article Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.readMoreContainer}>
            <Text style={styles.readMoreText}>Read full article</Text>
            <Ionicons name="arrow-forward" size={14} color="#3B82F6" />
          </View>
          
          {hasFile && (
            <View style={styles.attachmentIndicator}>
              <FontAwesome5 
                name={fileType === "image" ? "image" : "file-pdf"} 
                size={12} 
                color="#6B7280" 
              />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Standard Article Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  articleImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  articleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
    marginBottom: 8,
  },
  articlePreview: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
  attachmentIndicator: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Compact Card Styles
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  compactContent: {
    flex: 1,
  },
  tagContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 18,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  previewText: {
    fontSize: 11,
    color: '#9CA3AF',
    flex: 1,
    marginLeft: 8,
    textAlign: 'right',
  },
});

export default NewsSummaryCard;