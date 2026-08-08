import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  ScrollView,
  Image,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api, { resolveMediaUrl } from "../../src/services/api";
import analyticsService from "../../src/services/analyticsService";
import AppHeader from "../../src/components/AppHeader";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineBanner from "../components/OfflineBanner";
import { useAppTheme } from "../../src/context/ThemeContext";

const PAGE_SIZE = 10;
const FALLBACK_IMAGE = require("../../assets/images/fallback.png");
const ZRP_LOGO = require("../../assets/images/logo-alternate.png");

const CATEGORIES = [
  { key: "ALL", label: "All Publications" },
  { key: "Press Release", label: "Press Releases" },
  { key: "Public Notice", label: "Public Notices" },
  { key: "Alert", label: "Safety Alerts" },
  { key: "Incident Report", label: "Incident Reports" },
];

const CATEGORY_COLORS = {
  "Press Release": { bg: "#E6EFFC", text: "#0052CC" },
  "Public Notice": { bg: "#FEF3C7", text: "#D97706" },
  "Alert": { bg: "#FEE2E2", text: "#DC2626" },
  "Incident Report": { bg: "#F3E8FF", text: "#7C3AED" },
};

const SafeArticleImage = ({ src, style, resizeMode = "cover" }) => {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveMediaUrl(src);

  return (
    <Image
      source={resolvedUrl && !imgError ? { uri: resolvedUrl } : FALLBACK_IMAGE}
      style={style}
      resizeMode={resizeMode}
      onError={() => setImgError(true)}
    />
  );
};

const News = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOnline = useNetworkStatus();
  const { colors, isDark } = useAppTheme();

  const [news, setNews] = useState([]);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    analyticsService.trackFeature("News & Press Hub");
  }, []);

  const fetchNews = async (page = 1, isRefresh = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const params = { is_published: true, page, page_size: PAGE_SIZE };
      if (activeCategory !== "ALL") params.category = activeCategory;
      if (search.trim()) params.search = search.trim();

      const res = await api.publications.list(params);
      const items = res.items || [];

      if (isRefresh || page === 1) {
        setNews(items);
      } else {
        setNews((prev) => [...prev, ...items]);
      }

      setHasMore(items.length === PAGE_SIZE);
      setCurrentPage(page);
    } catch (err) {
      console.log("Failed to fetch news from API:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchNews(1, true);
  }, [activeCategory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNews(1, true);
    setRefreshing(false);
  }, [activeCategory, search]);

  const handleSearchSubmit = () => {
    fetchNews(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    fetchNews(currentPage + 1);
  };

  const openArticleDetails = (item) => {
    setSelectedArticle(item);
    setIsModalVisible(true);
    analyticsService.trackFeature(`News View: ${item.title}`);
  };

  const openExternalLink = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert("Link Error", "Unable to open external link.");
    });
  };

  const formatFullDate = (dateString) => {
    if (!dateString) return "Official Release";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "Official Release";
    }
  };

  const renderRichTextContent = (content) => {
    if (!content) return <Text style={[styles.modalDescription, { color: colors.textPrimary }]}>No detailed text content provided.</Text>;

    const parts = content.split(/(<img[^>]+src=["'][^"']+["'][^>]*>)/gi);

    return parts.map((part, index) => {
      const imgMatch = part.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch) {
        const src = imgMatch[1];
        return (
          <View key={index} style={{ marginVertical: 12, alignItems: 'center', backgroundColor: colors.sectionBg, borderRadius: 8, padding: 4, borderWidth: 1, borderColor: colors.border }}>
            <SafeArticleImage
              src={src}
              style={{ width: '100%', height: 220, borderRadius: 6 }}
              resizeMode="contain"
            />
          </View>
        );
      }

      const cleanText = part
        .replace(/<p[^>]*>/gi, "\n\n")
        .replace(/<h[1-6][^>]*>/gi, "\n\n")
        .replace(/<li[^>]*>/gi, "\n• ")
        .replace(/<br\s*[\/]?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();

      if (!cleanText) return null;

      return (
        <Text key={index} style={[styles.modalDescription, { color: colors.textPrimary }]}>
          {cleanText}
        </Text>
      );
    });
  };

  const renderNewsCard = ({ item }) => {
    const catColors = CATEGORY_COLORS[item.category] || { bg: "#E6EFFC", text: "#0052CC" };

    return (
      <TouchableOpacity
        style={[styles.newsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => openArticleDetails(item)}
        activeOpacity={0.88}
      >
        <SafeArticleImage
          src={item.cover_image_url}
          style={styles.newsImage}
          resizeMode="cover"
        />
        <View style={styles.newsContent}>
          <View style={styles.newsHeader}>
            <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
              <Text style={[styles.categoryBadgeText, { color: catColors.text }]}>
                {item.category || "Press Release"}
              </Text>
            </View>
            <Text style={[styles.newsDate, { color: colors.textMuted }]}>{formatFullDate(item.published_at)}</Text>
          </View>

          <Text style={[styles.newsTitle, { color: colors.primary }]} numberOfLines={2}>
            {item.title}
          </Text>

          {item.summary ? (
            <Text style={[styles.newsExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.summary}
            </Text>
          ) : (
            <Text style={[styles.newsExcerpt, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.content ? item.content.replace(/<[^>]*>/g, "") : ""}
            </Text>
          )}

          <View style={[styles.newsFooter, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[styles.readMoreLink, { color: colors.primary }]}>Read Communication</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>

            {item.view_count !== undefined && (
              <View style={styles.viewsTag}>
                <Ionicons name="eye-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.viewsText, { color: colors.textMuted }]}>{item.view_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ArticleModal = () => {
    if (!selectedArticle) return null;
    const catColors = CATEGORY_COLORS[selectedArticle.category] || { bg: "#E6EFFC", text: "#0052CC" };

    return (
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeaderBar, { height: 56 + insets.top, paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Official Press Communication</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <SafeArticleImage
              src={selectedArticle.cover_image_url}
              style={styles.modalImage}
              resizeMode="cover"
            />

            <View style={styles.modalContent}>
              <View style={styles.modalMetaRow}>
                <View style={[styles.categoryBadge, { backgroundColor: catColors.bg }]}>
                  <Text style={[styles.categoryBadgeText, { color: catColors.text }]}>
                    {selectedArticle.category || "Press Release"}
                  </Text>
                </View>
                <Text style={[styles.modalDate, { color: colors.textMuted }]}>{formatFullDate(selectedArticle.published_at)}</Text>
              </View>

              <Text style={[styles.modalTitle, { color: colors.primary }]}>{selectedArticle.title}</Text>

              {/* Summary box */}
              {selectedArticle.summary && (
                <View style={[styles.modalSummaryBox, { backgroundColor: colors.sectionBg, borderColor: colors.border, borderLeftColor: colors.primary }]}>
                  <Text style={[styles.modalSummaryText, { color: colors.textPrimary }]}>{selectedArticle.summary}</Text>
                </View>
              )}

              {/* Body Text & Rich Images */}
              {renderRichTextContent(selectedArticle.content)}

              {/* Downloadable Attachments */}
              {selectedArticle.attachments && selectedArticle.attachments.length > 0 && (
                <View style={[styles.attachmentsSection, { borderTopColor: colors.border }]}>
                  <Text style={[styles.attachmentsHeader, { color: colors.textPrimary }]}>Official Attachments</Text>
                  {selectedArticle.attachments.map((att, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.attachmentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => openExternalLink(resolveMediaUrl(att.url))}
                    >
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                      <Text style={[styles.attachmentName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {att.name || `Attachment ${i + 1}`}
                      </Text>
                      <Ionicons name="download-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={{ height: insets.bottom + 40 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.pageContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <Stack.Screen options={{ headerShown: false }} />

      <AppHeader
        title="News & Press Hub"
        subtitle="ZRP Command Official Communications"
      />

      {!isOnline && <OfflineBanner />}

      {/* Search Bar */}
      <View style={[styles.searchSection, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.sectionBg, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search headlines, notices..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => { setSearch(""); fetchNews(1, true); }}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category Pills Header */}
      <View style={[styles.pillsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.pill,
                  { backgroundColor: colors.sectionBg, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setActiveCategory(cat.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, { color: colors.textSecondary }, isActive && { color: "#FFFFFF", fontWeight: "700" }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Publications Content List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Fetching verified communications...
          </Text>
        </View>
      ) : news.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image source={ZRP_LOGO} style={styles.emptyLogo} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Publications Found</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            {search ? "No headlines match your search query." : "Try switching category filters above."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={news}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNewsCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <ArticleModal />
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    height: 44,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  pillsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  newsCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  newsImage: {
    width: "100%",
    height: 165,
  },
  newsContent: {
    padding: 14,
  },
  newsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  newsDate: {
    fontSize: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  newsExcerpt: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  readMoreLink: {
    fontSize: 13,
    fontWeight: "700",
  },
  viewsTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewsText: {
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeaderBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalImage: {
    width: "100%",
    height: 230,
  },
  modalContent: {
    padding: 16,
  },
  modalMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalDate: {
    fontSize: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
    lineHeight: 26,
  },
  modalSummaryBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  modalSummaryText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  attachmentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  attachmentsHeader: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  attachmentName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyLogo: {
    width: 60,
    height: 60,
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});

export default News;