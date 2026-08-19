import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Dimensions,
  Image,
  Linking,
  Platform,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import api from "../../lib/connection";
import { Ionicons } from "../components/Icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "../components/Header";
import SmoothBottomSheet from "../components/SmoothBottomSheet";
import ArticleImage, { FALLBACK_IMAGE } from "../components/ArticleImage";
import * as Sharing from "expo-sharing";
import * as WebBrowser from "expo-web-browser";

const { width, height } = Dimensions.get("window");
const PAGE_SIZE = 10;

// ─── Fallback Image ────────────────────────────────────────────────────────────

// ─── Main Component ───────────────────────────────────────────────────────────
const News = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);

  const categories = [
    { id: "all", label: "All", icon: "apps-outline" },
    { id: "press", label: "Press Releases", icon: "newspaper-outline" },
    { id: "announcements", label: "Announcements", icon: "megaphone-outline" },
    { id: "updates", label: "Updates", icon: "sync-outline" },
  ];

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchNews = async (page = 1, isRefresh = false) => {
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const records = await api.collection("news").getList(page, PAGE_SIZE, {
        sort: sortBy === "newest" ? "-created" : "created",
      });

      if (isRefresh || page === 1) {
        setNews(records.items);
        setFilteredNews(records.items);
      } else {
        setNews((prev) => [...prev, ...records.items]);
        setFilteredNews((prev) => [...prev, ...records.items]);
      }

      setHasMore(records.page < records.totalPages);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to fetch news", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNews(1, true);
    setRefreshing(false);
  }, [sortBy]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchNews(currentPage + 1);
  };

  useEffect(() => {
    fetchNews(1, true);
  }, [sortBy]);

  useEffect(() => {
    const filtered = news.filter((item) => {
      const matchSearch =
        !search.trim() ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        categoryFilter === "all" ||
        (item.category?.toLowerCase() || "press").includes(categoryFilter.toLowerCase());
      return matchSearch && matchCat;
    });
    setFilteredNews(filtered);
  }, [search, categoryFilter, news]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getImageUrl = (item) => {
    if (item.file) {
      const url = api.files.getURL(item, item.file);
      if (item.cover_image_url) return url;
      const ext = url.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return url;
    }
    return null;
  };

  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Recently";
    const now = new Date();
    const diffTime = now - date;
    if (diffTime < 0) return formatFullDate(dateString);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${diffMonths}mo ago`;
    return `${diffYears}y ago`;
  };

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategoryColor = (cat) => {
    const map = {
      press: "#DC2626",
      announcements: "#7C3AED",
      updates: "#059669",
    };
    return map[(cat || "press").toLowerCase()] || "#1E3A8A";
  };

  const getCategoryIcon = (cat) => {
    const map = {
      press: "newspaper-outline",
      announcements: "megaphone-outline",
      updates: "sync-outline",
    };
    return map[(cat || "press").toLowerCase()] || "document-text-outline";
  };

  // ── Share article using expo-sharing (text only) ───────────────────────────
  const shareArticle = async (article) => {
    if (!article) return;
    
    setSharing(true);
    try {
      const shareText = `📰 ${article.title}\n\n${article.description?.replace(/<[^>]*>/g, "") || "Read more"}\n\n🔗 Shared via SafeTap - Zimbabwe Republic Police App`;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(shareText, {
          dialogTitle: "Share Article",
          mimeType: "text/plain",

        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share article");
    } finally {
      setSharing(false);
    }
  };

  // ── Open external link using expo-web-browser ──────────────────────────────
  const openExternalLink = async (url) => {
    if (!url) return;
    
    try {
      await WebBrowser.openBrowserAsync(url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: "#1E3A8A",
        toolbarColor: "#1E3A8A",
      });
    } catch (error) {
      console.error("Error opening link:", error);
      Alert.alert("Error", "Could not open the link");
    }
  };

  // ── Extract links from content ────────────────────────────────────────────
  const extractLinks = (html) => {
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g;
    const links = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      links.push(match[2]);
    }
    return links;
  };

  // ── Apply filters ─────────────────────────────────────────────────────────
  const applyFilters = () => {
    setShowFilters(false);
  };

  const resetFilters = () => {
    setSortBy("newest");
    setCategoryFilter("all");
    setSearch("");
  };

  // ── Group by time period with detailed sections ───────────────────────────
  const groupByTimePeriod = (articles) => {
    const now = new Date();
    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      lastWeek: [],
      thisMonth: [],
      lastMonth: [],
      older: [],
    };

    articles.forEach((article) => {
      const date = new Date(article.created);
      if (Number.isNaN(date.getTime())) {
        groups.older.push(article);
        return;
      }
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        groups.today.push(article);
      } else if (diffDays === 0) {
        groups.today.push(article);
      } else if (diffDays === 1) {
        groups.yesterday.push(article);
      } else if (diffDays < 7) {
        groups.thisWeek.push(article);
      } else if (diffDays < 14) {
        groups.lastWeek.push(article);
      } else if (diffDays < 30) {
        groups.thisMonth.push(article);
      } else if (diffDays < 60) {
        groups.lastMonth.push(article);
      } else {
        groups.older.push(article);
      }
    });

    return groups;
  };

  // ── Get section title and icon ────────────────────────────────────────────
  const getSectionInfo = (sectionKey) => {
    const sectionMap = {
      today: { title: "Today", icon: "sunny-outline", color: "#F59E0B" },
      yesterday: { title: "Yesterday", icon: "time-outline", color: "#6B7280" },
      thisWeek: { title: "This Week", icon: "calendar-outline", color: "#3B82F6" },
      lastWeek: { title: "Last Week", icon: "calendar-outline", color: "#8B5CF6" },
      thisMonth: { title: "This Month", icon: "calendar-outline", color: "#10B981" },
      lastMonth: { title: "Last Month", icon: "calendar-outline", color: "#EC489A" },
      older: { title: "Older", icon: "archive-outline", color: "#6B7280" },
    };
    return sectionMap[sectionKey];
  };

  // ── News Card Component (Image first) ──────────────────────────────────────
  const NewsCard = ({ item }) => {
    const category = item.category || "Press Release";
    const catColor = getCategoryColor(category);
    const relativeDate = formatRelativeDate(item.created);

    return (
      <TouchableOpacity
        style={styles.newsCard}
        onPress={() => {
          setSelectedArticle(item);
          setIsModalVisible(true);
        }}
        activeOpacity={0.9}
      >
        <View style={styles.newsContent}>
          <View style={styles.newsHeader}>
            <View style={[styles.categoryChip, { backgroundColor: `${catColor}15` }]}>
              <Ionicons name={getCategoryIcon(category)} size={12} color={catColor} />
              <Text style={[styles.categoryText, { color: catColor }]}>{category}</Text>
            </View>
            <Text style={styles.newsDate}>{relativeDate}</Text>
          </View>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.newsExcerpt} numberOfLines={2}>
            {item.description?.replace(/<[^>]*>/g, "") || "Click to read more..."}
          </Text>
          <View style={styles.newsFooter}>
            <Text style={[styles.readMoreLink, { color: catColor }]}>Read full story</Text>
            <Ionicons name="chevron-forward" size={14} color={catColor} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FeaturedStory = ({ item }) => {
    const imageUrl = getImageUrl(item);
    const category = item.category || "Press Release";
    const catColor = getCategoryColor(category);
    return (
      <TouchableOpacity
        style={styles.featuredCard}
        activeOpacity={0.92}
        onPress={() => { setSelectedArticle(item); setIsModalVisible(true); }}
      >
        <ArticleImage source={imageUrl ? { uri: imageUrl } : FALLBACK_IMAGE} style={styles.featuredImage} resizeMode="cover" />
        <View style={styles.featuredContent}>
          <View style={styles.featuredKickerRow}>
            <Text style={styles.featuredKicker}>TOP STORY</Text>
            <Text style={styles.featuredDate}>{formatRelativeDate(item.created)}</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={3}>{item.title}</Text>
          <Text style={styles.featuredExcerpt} numberOfLines={2}>
            {item.description?.replace(/<[^>]*>/g, "") || "Read the latest official update."}
          </Text>
          <View style={styles.featuredFooter}>
            <View style={[styles.categoryChip, { backgroundColor: `${catColor}15` }]}>
              <Ionicons name={getCategoryIcon(category)} size={12} color={catColor} />
              <Text style={[styles.categoryText, { color: catColor }]}>{category}</Text>
            </View>
            <View style={styles.readStoryAction}>
              <Text style={styles.readStoryText}>Read story</Text>
              <Ionicons name="arrow-forward" size={16} color="#1E3A8A" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render grouped sections ───────────────────────────────────────────────
  const renderGroupedSections = () => {
    const groups = groupByTimePeriod(filteredNews);
    const sections = [
      { key: "today", data: groups.today },
      { key: "yesterday", data: groups.yesterday },
      { key: "thisWeek", data: groups.thisWeek },
      { key: "lastWeek", data: groups.lastWeek },
      { key: "thisMonth", data: groups.thisMonth },
      { key: "lastMonth", data: groups.lastMonth },
      { key: "older", data: groups.older },
    ];

    return sections.map((section) => {
      if (section.data.length === 0) return null;
      
      const sectionInfo = getSectionInfo(section.key);
      
      return (
        <View key={section.key} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: `${sectionInfo.color}15` }]}>
              <Ionicons name={sectionInfo.icon} size={20} color={sectionInfo.color} />
            </View>
            <Text style={styles.sectionTitle}>{sectionInfo.title}</Text>
            <Text style={styles.sectionCount}>({section.data.length})</Text>
          </View>
          {section.data.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </View>
      );
    });
  };

  // ─── Full Screen Modal for Article ─────────────────────────────────────────
  const ArticleModal = () => {
    if (!selectedArticle) return null;

    const imageUrl = getImageUrl(selectedArticle);
    const category = selectedArticle.category || "Press Release";
    const catColor = getCategoryColor(category);
    const fullDate = formatFullDate(selectedArticle.created);
    const links = extractLinks(selectedArticle.description || "");

    return (
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Article</Text>
            {/* <TouchableOpacity
              style={styles.modalShareButton}
              onPress={() => shareArticle(selectedArticle)}
              disabled={sharing}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#1E3A8A" />
              ) : (
                <Ionicons name="share-outline" size={22} color="#1E3A8A" />
              )}
            </TouchableOpacity> */}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ArticleImage
              source={imageUrl ? { uri: imageUrl } : FALLBACK_IMAGE}
              style={styles.modalImage}
            />
            
            <View style={styles.modalContent}>
              <View style={styles.modalMeta}>
                <View style={[styles.modalCategoryBadge, { backgroundColor: `${catColor}15` }]}>
                  <Ionicons name={getCategoryIcon(category)} size={14} color={catColor} />
                  <Text style={[styles.modalCategoryText, { color: catColor }]}>
                    {category}
                  </Text>
                </View>
                <Text style={styles.modalDate}>{fullDate}</Text>
              </View>

              <Text style={styles.modalTitle}>{selectedArticle.title}</Text>
              
              <Text style={styles.modalDescription}>
                {selectedArticle.description?.replace(/<[^>]*>/g, "") || "No description available"}
              </Text>

              {/* External Links */}
              {links.length > 0 && (
                <View style={styles.linksSection}>
                  <Text style={styles.linksTitle}>Related Links</Text>
                  {links.map((link, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.linkItem}
                      onPress={() => openExternalLink(link)}
                    >
                      <Ionicons name="open-outline" size={16} color="#3B82F6" />
                      <Text style={styles.linkText} numberOfLines={1}>
                        {link}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={{ height: insets.bottom + 20 }} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ── Filter Modal ───────────────────────────────────────────────────────────
  const FilterModal = () => (
    <SmoothBottomSheet
      visible={showFilters}
      onClose={() => setShowFilters(false)}
      contentStyle={styles.filterModalContent}
    >
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter & Sort</Text>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              style={styles.filterModalClose}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Sort By</Text>
              <View style={styles.sortRow}>
                <TouchableOpacity
                  style={[styles.sortChip, sortBy === "newest" && styles.sortChipActive]}
                  onPress={() => setSortBy("newest")}
                >
                  <Ionicons name="arrow-down" size={16} color={sortBy === "newest" ? "#1E3A8A" : "#6B7280"} />
                  <Text style={[styles.sortChipText, sortBy === "newest" && styles.sortChipTextActive]}>
                    Newest First
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.sortChip, sortBy === "oldest" && styles.sortChipActive]}
                  onPress={() => setSortBy("oldest")}
                >
                  <Ionicons name="arrow-up" size={16} color={sortBy === "oldest" ? "#1E3A8A" : "#6B7280"} />
                  <Text style={[styles.sortChipText, sortBy === "oldest" && styles.sortChipTextActive]}>
                    Oldest First
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      categoryFilter === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategoryFilter(cat.id)}
                  >
                    <Ionicons name={cat.icon} size={16} color={categoryFilter === cat.id ? "#1E3A8A" : "#6B7280"} />
                    <Text
                      style={[
                        styles.categoryChipText,
                        categoryFilter === cat.id && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterResetButton}
              onPress={resetFilters}
            >
              <Ionicons name="refresh-outline" size={18} color="#DC2626" />
              <Text style={styles.filterResetButtonText}>Reset All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={applyFilters}
            >
              <Text style={styles.filterApplyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
          
    </SmoothBottomSheet>
  );

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <CustomHeader title="News & Press" subtitle="Zimbabwe Republic Police" showLogo compact rightComponent={(
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
            {(categoryFilter !== "all" || sortBy !== "newest") && (
              <View style={styles.activeFilterDot} />
            )}
          </TouchableOpacity>
        </View>
      )} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search articles..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.categoryNav}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryNavContent}>
          {categories.map((category) => {
            const active = categoryFilter === category.id;
            return (
              <TouchableOpacity key={category.id} style={[styles.categoryNavItem, active && styles.categoryNavItemActive]} onPress={() => setCategoryFilter(category.id)}>
                <Ionicons name={category.icon} size={16} color={active ? "#FFFFFF" : "#475569"} />
                <Text style={[styles.categoryNavText, active && styles.categoryNavTextActive]}>{category.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Filters */}
      {(categoryFilter !== "all" || search) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersLabel}>Active filters:</Text>
          <View style={styles.filterChips}>
            {categoryFilter !== "all" && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  {categories.find(c => c.id === categoryFilter)?.label}
                </Text>
                <TouchableOpacity onPress={() => setCategoryFilter("all")}>
                  <Ionicons name="close" size={14} color="#1E3A8A" />
                </TouchableOpacity>
              </View>
            )}
            {search && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>Search: {search}</Text>
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close" size={14} color="#1E3A8A" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={styles.clearAllChip}
              onPress={resetFilters}
            >
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* News List */}
      {loading ? (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.skeletonContainer}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonImage} />
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonRow}>
                  <View style={[styles.skeletonPill, { width: 80 }]} />
                  <View style={[styles.skeletonLine, { width: 60 }]} />
                </View>
                <View style={[styles.skeletonLine, { width: "90%", height: 18, marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: "70%", height: 14, marginTop: 6 }]} />
                <View style={[styles.skeletonLine, { width: "50%", height: 12, marginTop: 8 }]} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredNews.slice(1)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NewsCard item={item} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#1E3A8A"]}
              tintColor="#1E3A8A"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            filteredNews.length > 0 && !loading ? (
              <View>
                <FeaturedStory item={filteredNews[0]} />
                {filteredNews.length > 1 && (
                  <View style={styles.latestHeader}>
                    <Text style={styles.latestTitle}>Latest updates</Text>
                    <Text style={styles.resultsText}>{filteredNews.length} stories</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#1E3A8A" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="newspaper-outline" size={48} color="#D1D5DB" />
                </View>
                <Text style={styles.emptyTitle}>No articles found</Text>
                <Text style={styles.emptySubtitle}>
                  {search || categoryFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Check back later for updates"}
                </Text>
                {(search || categoryFilter !== "all") && (
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={resetFilters}
                  >
                    <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      )}

      {/* Modals */}
      <ArticleModal />
      <FilterModal />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerEyebrow: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  activeFilterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
    borderWidth: 1,
    borderColor: "#1E3A8A",
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  categoryNav: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  categoryNavContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
  },
  categoryNavItemActive: { backgroundColor: "#1E3A8A" },
  categoryNavText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  categoryNavTextActive: { color: "#FFFFFF" },
  activeFilters: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  activeFiltersLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  filterChipText: {
    fontSize: 12,
    color: "#1E3A8A",
    fontWeight: "500",
  },
  clearAllChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  clearAllText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 10,
  },
  sectionCount: {
    fontSize: 14,
    color: "#9CA3AF",
    marginLeft: 6,
  },
  newsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 0,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  newsContent: {
    padding: 16,
  },
  newsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    flexShrink: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  newsDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  newsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 23,
    marginBottom: 8,
  },
  newsExcerpt: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginBottom: 12,
  },
  newsFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readMoreLink: {
    fontSize: 12,
    fontWeight: "600",
  },
  featuredCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 22,
    elevation: 0,
  },
  featuredImage: { width: "100%", height: 210, backgroundColor: "#E2E8F0" },
  featuredContent: { padding: 18 },
  featuredKickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  featuredKicker: { fontSize: 11, fontWeight: "800", color: "#B91C1C", letterSpacing: 1.1 },
  featuredDate: { fontSize: 12, color: "#64748B" },
  featuredTitle: { fontSize: 23, lineHeight: 29, fontWeight: "800", color: "#0F172A", letterSpacing: -0.4 },
  featuredExcerpt: { fontSize: 14, lineHeight: 21, color: "#64748B", marginTop: 10 },
  featuredFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 16 },
  readStoryAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  readStoryText: { fontSize: 13, fontWeight: "700", color: "#1E3A8A" },
  latestHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  latestTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  skeletonImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#E5E7EB",
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skeletonPill: {
    height: 20,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
  },
  skeletonLine: {
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  loadingMore: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
  },
  clearFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
  },
  clearFiltersButtonText: {
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalShareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalImage: {
    width: "100%",
    height: 250,
    backgroundColor: "#F3F4F6",
  },
  modalContent: {
    padding: 20,
  },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  modalCategoryText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  modalDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 32,
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 24,
  },
  linksSection: {
    marginBottom: 24,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: "#3B82F6",
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  filterModalClose: {
    padding: 4,
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  filterSectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sortRow: {
    flexDirection: "row",
    gap: 12,
  },
  sortChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  sortChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#1E3A8A",
  },
  sortChipText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  sortChipTextActive: {
    color: "#1E3A8A",
    fontWeight: "600",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#1E3A8A",
  },
  categoryChipText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#1E3A8A",
    fontWeight: "600",
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  filterResetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  filterResetButtonText: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#1E3A8A",
    borderRadius: 12,
    alignItems: "center",
  },
  filterApplyButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

export default News;
