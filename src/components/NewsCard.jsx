import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { resolveMediaUrl } from "../services/api";
import { colors, radius, spacing, typography, borders } from "../constants/theme";
import { useAppTheme } from "../context/ThemeContext";

const DEFAULT_FALLBACK = require("../../assets/images/fallback.png");

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
  const { colors, isDark } = useAppTheme();
  const [imageError, setImageError] = React.useState(false);
  const rawUrl = resolveMediaUrl(item?.cover_image_url || item?.file || item?.image);
  const fileUrl = imageError || !rawUrl ? null : { uri: rawUrl };
  const imageSource = fileUrl || DEFAULT_FALLBACK;

  const categoryColorMap = {
    "Press Release": { bg: isDark ? "#0C4A6E" : "#E6EFFC", text: colors.primary },
    "Public Notice": { bg: isDark ? "#78350F" : "#FEF3C7", text: colors.warning },
    "Alert": { bg: isDark ? "#7F1D1D" : "#FEE2E2", text: colors.danger },
    "Incident Report": { bg: isDark ? "#4C1D95" : "#F3E8FF", text: isDark ? "#C084FC" : "#7C3AED" },
  };

  const catColors = categoryColorMap[item.category] || { bg: colors.primarySoft, text: colors.primary };

  const getHumanFriendlyDate = (dateString) => {
    if (!dateString) return "Recently";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
        style={[styles.compactCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardStyle]}
        activeOpacity={0.8}
      >
        {showImage && (
          <Image
            source={imageSource}
            style={[styles.compactImage, { backgroundColor: colors.sectionBg }]}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
        <View style={styles.compactContent}>
          {showTag && (
            <View style={[styles.tagContainer, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.tagText, { color: catColors.text }]}>{item.category || "PRESS RELEASE"}</Text>
            </View>
          )}
          <Text style={[styles.compactTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {item.title}
          </Text>
          {showDate && (
            <View style={styles.metaRow}>
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
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
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardStyle]}
      activeOpacity={0.8}
    >
      {showImage && (
        <Image
          source={imageSource}
          style={[styles.articleImage, { backgroundColor: colors.sectionBg }]}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          {showTag && (
            <View style={[styles.articleTag, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.articleTagText, { color: catColors.text }]}>{item.category || "PRESS RELEASE"}</Text>
            </View>
          )}
          {showDate && (
            <View style={styles.dateContainer}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.dateText, { color: colors.textMuted }]}>
                {getHumanFriendlyDate(item.published_at || item.created_at)}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.articleTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>

        {(item.summary || item.content) && (
          <Text style={[styles.articlePreview, { color: colors.textSecondary }]} numberOfLines={2}>
            {formatDescription(item.summary || item.content)}
          </Text>
        )}

        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.readMoreContainer}>
            <Text style={[styles.readMoreText, { color: colors.primary }]}>Read full article</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
          {item.view_count !== undefined && (
            <View style={styles.viewsContainer}>
              <Ionicons name="eye-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.viewsText, { color: colors.textMuted }]}>{item.view_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: radius.card,
    overflow: 'hidden',
    marginBottom: spacing.cardSpacing,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  articleImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.neutral[100],
  },
  cardContent: {
    padding: spacing.screenPadding,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.micro,
  },
  articleTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  articleTagText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    ...typography.caption,
    color: colors.neutral[600],
  },
  articleTitle: {
    ...typography.title,
    color: colors.neutral[950],
    marginBottom: spacing.micro,
  },
  articlePreview: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    marginBottom: spacing.component,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.component,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    ...typography.button,
    fontSize: 14,
    color: colors.primary,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewsText: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  compactCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: radius.card,
    padding: spacing.cardSpacing,
    marginBottom: spacing.component,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  compactImage: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    marginRight: spacing.component,
  },
  compactContent: { flex: 1 },
  tagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.chip,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tagText: { fontSize: 10, fontWeight: '700' },
  compactTitle: { ...typography.bodySmall, fontWeight: "600", color: colors.neutral[950], marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, color: colors.neutral[600] },
});

export default NewsCard;
