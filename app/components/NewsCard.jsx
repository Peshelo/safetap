import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import React from "react";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { resolveMediaUrl } from "../../lib/api";

const NewsCard = ({
  item,
  onPress,
  showDescription = false,
  showTag = true,
  cardStyle = {},
  compact = false,
  showImage = true,
  showDate = true,
}) => {
  const fileUrl = resolveMediaUrl(item.cover_image_url || item.file);

  const getHumanFriendlyDate = (dateString) => {
    if (!dateString) return "Recently";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (error) {
      return "Recently";
    }
  };

  const formatDescription = (text) => {
    if (!text) return "";
    const cleanText = text.replace(/<[^>]*>/g, "").trim();
    if (cleanText.length > 100) {
      return cleanText.substring(0, 100) + "...";
    }
    return cleanText;
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => onPress?.(item)}
        style={[styles.compactCard, cardStyle]}
        activeOpacity={0.8}
      >
        {fileUrl && showImage && (
          <Image
            source={{ uri: fileUrl }}
            style={styles.compactImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.compactContent}>
          {showTag && (
            <View style={styles.tagContainer}>
              <Text style={styles.tagText}>{item.category || "PRESS"}</Text>
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
                  {getHumanFriendlyDate(item.published_at || item.created_at)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={() => onPress?.(item)}
      style={[styles.card, cardStyle]}
      activeOpacity={0.8}
    >
      {fileUrl && showImage && (
        <Image
          source={{ uri: fileUrl }}
          style={styles.articleImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          {showTag && (
            <View style={styles.articleTag}>
              <Text style={styles.articleTagText}>{item.category || "PRESS RELEASE"}</Text>
            </View>
          )}
          {showDate && (
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.dateText}>
                {getHumanFriendlyDate(item.published_at || item.created_at)}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.articleTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {(item.summary || item.description) && (
          <Text style={styles.articlePreview} numberOfLines={2}>
            {formatDescription(item.summary || item.description)}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.readMoreContainer}>
            <Text style={styles.readMoreText}>Read full article</Text>
            <Ionicons name="arrow-forward" size={14} color="#0052CC" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  articleImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F1F5F9',
  },
  cardContent: {
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  articleTag: {
    backgroundColor: '#E6EFFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  articleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0052CC',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  articleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
    marginBottom: 6,
  },
  articlePreview: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    color: '#0052CC',
    fontWeight: '700',
  },
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  compactImage: {
    width: 56,
    height: 56,
    borderRadius: 6,
    marginRight: 10,
  },
  compactContent: { flex: 1 },
  tagContainer: {
    backgroundColor: '#E6EFFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tagText: { fontSize: 9, fontWeight: '700', color: '#0052CC' },
  compactTitle: { fontSize: 13, fontWeight: "600", color: "#0F172A", marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: '#64748B' },
});

export default NewsCard;