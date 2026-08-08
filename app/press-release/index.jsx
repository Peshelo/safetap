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
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { Stack, useRouter } from "expo-router";
import api, { resolveMediaUrl } from "../../src/services/api";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../../src/components/AppHeader";

const { width } = Dimensions.get("window");
const PAGE_SIZE = 10;

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=800&q=80";

const News = () => {
  const navigation = useNavigation();
    const router = useRouter();
  
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

      const params = { is_published: true, page, page_size: PAGE_SIZE };
      if (categoryFilter !== "all") params.category = categoryFilter;

      const res = await api.publications.list(params);
      const items = res.items || [];

      if (isRefresh || page === 1) {
        setNews(items);
        setFilteredNews(items);
      } else {
        setNews(prev => [...prev, ...items]);
        setFilteredNews(prev => [...prev, ...items]);
      }

      setTotalItems(res.total || items.length);
      setHasMore(items.length === PAGE_SIZE);
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
    if (item.cover_image_url) {
      return resolveMediaUrl(item.cover_image_url);
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
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalSection}>
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

          <View style={styles.modalSection}>
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

          <View style={styles.modalActions}>
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
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
      
      {/* App Bar (ZRP Blue with logo and safe area top inset) */}
      <AppHeader
        title="News & Press Releases"
        subtitle="Zimbabwe Republic Police Official Releases"
        showBack={true}
        rightActions={[
          {
            iconName: "search-outline",
            onPress: () => setShowSearch(!showSearch),
          },
        ]}
      />

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
        onPress={() => setShowFilters(true)}
      >
        <Ionicons name="filter" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  // Header from EmergencyContacts
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
    borderRadius: 10,
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
  listContainer: {
    paddingBottom: 100,
  },
  newsItem: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  itemContent: {
    flexDirection: "row",
    padding: 16,
    paddingBottom: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: "#1E3A8A",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  date: {
    fontSize: 12,
    color: "#6b7280",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
    marginBottom: 6,
  },
  excerpt: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 5,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  readMore: {
    fontSize: 13,
    color: "#1E3A8A",
    marginRight: 4,
    fontWeight: "500",
  },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
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
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  sortOptionActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#1E3A8A",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  sortOptionTextActive: {
    color: "#1E3A8A",
    fontWeight: "600",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  categoryButtonActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#1E3A8A",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "#1E3A8A",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#1E3A8A",
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
  },
});

export default News;