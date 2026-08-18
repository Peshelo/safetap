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
  Animated,
  PanResponder,
  SafeAreaView,
  StatusBar,
} from "react-native";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import pb from "../../lib/connection";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const PAGE_SIZE = 10;
const FILTER_DRAWER_HEIGHT = 500;

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&q=80";

const News = () => {
  const navigation = useNavigation();
  const router = useRouter();

  // Animation refs
  const filterSheetAnim = useRef(new Animated.Value(FILTER_DRAWER_HEIGHT)).current;
  const filterOverlayAnim = useRef(new Animated.Value(0)).current;
  
  // Pan responder for filter drawer
  const filterPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) filterSheetAnim.setValue(Math.min(g.dy, FILTER_DRAWER_HEIGHT));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100 || g.vy > 0.5) closeFilters();
        else openFilters();
      },
    })
  ).current;
  
  // State
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
  const [totalItems, setTotalItems] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSearch, setShowSearch] = useState(false);

  // Filter drawer animations
  const openFilters = () => {
    setShowFilters(true);
    Animated.parallel([
      Animated.spring(filterSheetAnim, {
        toValue: 0,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(filterOverlayAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeFilters = () => {
    Animated.parallel([
      Animated.spring(filterSheetAnim, {
        toValue: FILTER_DRAWER_HEIGHT,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(filterOverlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowFilters(false));
  };

  const categories = [
    { id: "all", label: "All" },
    { id: "press", label: "Press" },
    { id: "announcements", label: "Announcements" },
    { id: "updates", label: "Updates" },
  ];

  const fetchNews = async (page = 1, isRefresh = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const queryParams = {
        page: page,
        perPage: PAGE_SIZE,
        sort: sortBy === "newest" ? "-created" : "created",
      };

      const records = await pb.collection("news").getList(
        queryParams.page,
        queryParams.perPage,
        queryParams
      );

      if (isRefresh || page === 1) {
        setNews(records.items);
        setFilteredNews(records.items);
      } else {
        setNews(prev => [...prev, ...records.items]);
        setFilteredNews(prev => [...prev, ...records.items]);
      }

      setTotalItems(records.totalItems);
      setHasMore(records.items.length === PAGE_SIZE);
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

  const getImageUrl = (item) => {
    if (item.file) {
      const fileUrl = pb.files.getURL(item, item.file);
      const ext = fileUrl.split(".").pop().toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        return fileUrl;
      }
    }
    return FALLBACK_IMAGE;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: "numeric"
    });
  };

  const filterByDate = (item) => {
    if (!selectedDate) return true;
    
    const itemDate = new Date(item.created);
    const selected = new Date(selectedDate);
    
    return (
      itemDate.getDate() === selected.getDate() &&
      itemDate.getMonth() === selected.getMonth() &&
      itemDate.getFullYear() === selected.getFullYear()
    );
  };

  const filterBySearch = (item) => {
    if (!search.trim()) return true;
    
    const searchTerm = search.toLowerCase().trim();
    return (
      item.title?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.content?.toLowerCase().includes(searchTerm)
    );
  };

  const filterByCategory = (item) => {
    if (categoryFilter === "all") return true;
    
    const itemCategory = item.category?.toLowerCase() || "press";
    return itemCategory.includes(categoryFilter.toLowerCase());
  };

  useEffect(() => {
    fetchNews(1, true);
  }, [sortBy]);

  useEffect(() => {
    let filtered = news.filter(item => 
      filterBySearch(item) && 
      filterByCategory(item) && 
      filterByDate(item)
    );
    setFilteredNews(filtered);
  }, [search, categoryFilter, selectedDate, news]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchNews(currentPage + 1);
  };

  const renderSkeleton = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <View key={index} style={styles.skeletonCard}>
        <View style={styles.skeletonHeader}>
          <View style={[styles.skeletonLine, { width: '40%', height: 16 }]} />
          <View style={[styles.skeletonLine, { width: '20%', height: 12 }]} />
        </View>
        <View style={[styles.skeletonLine, { height: 20, marginTop: 8 }]} />
        <View style={[styles.skeletonLine, { height: 16, marginTop: 6, width: '70%' }]} />
        <View style={[styles.skeletonLine, { height: 12, marginTop: 12, width: '30%' }]} />
      </View>
    ));
  };

  const renderNewsItem = ({ item }) => {
    const imageUrl = getImageUrl(item);
    const category = item.category || "Press Release";

    return (
      <TouchableOpacity 
        style={styles.newsItem}
        onPress={() => router.push(`/press-release/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.itemContent}>
          <View style={styles.textContent}>
            <View style={styles.itemHeader}>
              <Text style={styles.category}>{category}</Text>
              <Text style={styles.date}>{formatDate(item.created)}</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.excerpt} numberOfLines={2}>
                {item.description.replace(/<[^>]*>/g, "")}
              </Text>
            )}
          </View>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.itemImage}
            defaultSource={{ uri: FALLBACK_IMAGE }}
          />
        </View>
        <View style={styles.itemFooter}>
          <Text style={styles.readMore}>Read More</Text>
          <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    showFilters ? (
      <>
        {/* Overlay */}
        <Animated.View
          style={[
            styles.filterOverlay,
            {
              opacity: filterOverlayAnim,
            },
          ]}
          pointerEvents={showFilters ? "auto" : "none"}
        >
          <TouchableOpacity
            style={styles.filterOverlayTouch}
            onPress={closeFilters}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Filter Drawer */}
        <Animated.View
          style={[
            styles.filterSheet,
            {
              transform: [{ translateY: filterSheetAnim }],
            },
          ]}
          {...filterPanResponder.panHandlers}
        >
          <View style={styles.sheetHandle}>
            <View style={styles.sheetHandleBar} />
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={styles.filterContent}
            scrollEventThrottle={16}
          >
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={closeFilters}>
                <Ionicons name="close" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Sort Section */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Sort By</Text>
              <View style={styles.sortOptions}>
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === "newest" && styles.sortOptionActive]}
                  onPress={() => setSortBy("newest")}
                >
                  <Text style={[styles.sortOptionText, sortBy === "newest" && styles.sortOptionTextActive]}>
                    Newest First
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortOption, sortBy === "oldest" && styles.sortOptionActive]}
                  onPress={() => setSortBy("oldest")}
                >
                  <Text style={[styles.sortOptionText, sortBy === "oldest" && styles.sortOptionTextActive]}>
                    Oldest First
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Categories Section */}
            <View style={styles.filterSection}>
              <Text style={styles.sectionLabel}>Categories</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryButton, categoryFilter === cat.id && styles.categoryButtonActive]}
                    onPress={() => setCategoryFilter(cat.id)}
                  >
                    <Text style={[styles.categoryButtonText, categoryFilter === cat.id && styles.categoryButtonTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSortBy("newest");
                  setCategoryFilter("all");
                  setSelectedDate(null);
                  setSearch("");
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={closeFilters}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </>
    ) : null
  );

  const renderSearchBar = () => {
    if (!showSearch) return null;
    
    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#718096" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search news..."
            placeholderTextColor="#a0aec0"
            value={search}
            onChangeText={setSearch}
            autoFocus={true}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={20} color="#cbd5e0" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#1E3A8A" />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header from EmergencyContacts */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News & Press</Text>
        <TouchableOpacity 
          style={styles.headerRight}
          onPress={() => setShowSearch(!showSearch)}
        >
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      {renderSearchBar()}

      {/* Loading State */}
      {loading ? (
        <ScrollView style={styles.loadingContainer}>
          {renderSkeleton()}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => item.id}
          renderItem={renderNewsItem}
          contentContainerStyle={styles.listContainer}
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
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={48} color="#cbd5e0" />
              <Text style={styles.emptyTitle}>
                {search || selectedDate || categoryFilter !== "all" 
                  ? "No articles found" 
                  : "No news articles"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search || selectedDate || categoryFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Check back later for updates"}
              </Text>
              {(search || selectedDate || categoryFilter !== "all") && (
                <TouchableOpacity 
                  style={styles.emptyButton} 
                  onPress={() => {
                    setSearch("");
                    setSelectedDate(null);
                    setCategoryFilter("all");
                  }}
                >
                  <Text style={styles.emptyButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Floating Filter Button */}
      <TouchableOpacity 
        style={styles.floatingFilterButton}
        onPress={openFilters}
      >
        <Ionicons name="filter" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Filter Drawer */}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  // Header
  header: {
    backgroundColor: "#1E3A8A",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Search
  searchContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2d3748",
    paddingVertical: 8,
  },
  // Loading
  loadingContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  skeletonLine: {
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
  },
  // News List
  listContainer: {
    paddingBottom: 100,
  },
  newsItem: {
    backgroundColor: "#ffffff",
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemContent: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  textContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  category: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
    textTransform: "uppercase",
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  date: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  readMore: {
    fontSize: 13,
    color: "#1E3A8A",
    marginRight: 4,
    fontWeight: "600",
  },
  // Floating Button
  floatingFilterButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1E3A8A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Loading More
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 12,
    color: "#6b7280",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4a5568",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#a0aec0",
    textAlign: "center",
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f7fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyButtonText: {
    fontSize: 14,
    color: "#1E3A8A",
    fontWeight: "600",
  },
  // Filter Drawer Styles
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 40,
  },
  filterOverlayTouch: {
    flex: 1,
  },
  filterSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FILTER_DRAWER_HEIGHT,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    alignItems: "center",
    paddingVertical: 12,
  },
  sheetHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e0",
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  filterSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  sortOptions: {
    flexDirection: "row",
    gap: 12,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  sortOptionActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#1E3A8A",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
  sortOptionTextActive: {
    color: "#1E3A8A",
    fontWeight: "700",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  categoryButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#1E3A8A",
  },
  categoryButtonText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  categoryButtonTextActive: {
    color: "#1E3A8A",
    fontWeight: "700",
  },
  filterActions: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  resetButtonText: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "700",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#1E3A8A",
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "700",
  },
});

export default News;