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
} from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import pb from "../../lib/connection";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";

const { width } = Dimensions.get("window");

const News = () => {
  const navigation = useNavigation();
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [thumbnails, setThumbnails] = useState({});
  const [thumbnailLoading, setThumbnailLoading] = useState({});

  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [dateFilter, setDateFilter] = useState("all");

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const records = await pb
        .collection("news")
        .getFullList({ sort: "-created" });
      setNews(records);
      setFilteredNews(records);

      // Generate thumbnails for each item with a file
      records.forEach((item) => {
        if (item.file) {
          generateThumbnail(item);
        }
      });
    } catch (err) {
      console.error("Failed to fetch news", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

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

  const downloadFile = async (url) => {
    try {
      const fileType = getFileType(url);
      if (!fileType) return;

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        FileSystem.documentDirectory +
          `download_${Date.now()}.${fileType === "image" ? "jpg" : "pdf"}`,
        {}
      );

      const { uri } = await downloadResumable.downloadAsync();

      if (Platform.OS === "android") {
        const mimeType =
          fileType === "image" ? "image/jpeg" : "application/pdf";
        IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: uri,
          flags: 1,
          type: mimeType,
        });
      } else {
        await Linking.openURL(uri);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const generateThumbnail = async (item) => {
    if (!item.file || thumbnailLoading[item.id]) return;

    setThumbnailLoading((prev) => ({ ...prev, [item.id]: true }));

    try {
      const fileUrl = getFileUrl(item);
      const fileType = getFileType(fileUrl);

      if (fileType === "image") {
        // For images, we can use the URL directly as thumbnail
        setThumbnails((prev) => ({
          ...prev,
          [item.id]: { type: "image", uri: fileUrl },
        }));
      } else if (fileType === "pdf") {
        // For PDFs, we'd ideally generate a thumbnail, but in React Native we'll use an icon
        // In a real app, you might want to use a service to generate PDF thumbnails
        setThumbnails((prev) => ({
          ...prev,
          [item.id]: { type: "pdf", uri: null },
        }));
      }
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
    } finally {
      setThumbnailLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    let filtered = [...news];
    const lower = search.toLowerCase();

    // Text search filter
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(lower) ||
          item.description?.toLowerCase().includes(lower)
      );
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case "today":
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.created);
          return itemDate >= today;
        });
        break;
      case "week":
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.created);
          return itemDate >= weekAgo;
        });
        break;
      case "month":
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.created);
          return itemDate >= monthAgo;
        });
        break;
      case "year":
        const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((item) => {
          const itemDate = new Date(item.created);
          return itemDate >= yearAgo;
        });
        break;
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.created) - new Date(a.created));
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.created) - new Date(b.created));
        break;
      case "title":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    setFilteredNews(filtered);
  }, [search, news, sortBy, dateFilter]);

  const openPreview = (item) => {
    setPreviewItem(item);
    setPreviewVisible(true);
  };

  const closePreview = () => {
    setPreviewVisible(false);
    setPreviewItem(null);
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter & Sort</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Sort Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            {[
              { key: "newest", label: "Newest First", icon: "arrow-down" },
              { key: "oldest", label: "Oldest First", icon: "arrow-up" },
              { key: "title", label: "Title (A-Z)", icon: "text" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  sortBy === option.key && styles.filterOptionSelected,
                ]}
                onPress={() => setSortBy(option.key)}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={sortBy === option.key ? "#3b82f6" : "#6b7280"}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      sortBy === option.key && styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.key && (
                  <Ionicons name="checkmark" size={18} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Filter Section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            {[
              { key: "all", label: "All Time", icon: "calendar-outline" },
              { key: "today", label: "Today", icon: "today-outline" },
              { key: "week", label: "Last 7 Days", icon: "calendar-outline" },
              { key: "month", label: "Last 30 Days", icon: "calendar-outline" },
              { key: "year", label: "Last Year", icon: "calendar-outline" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  dateFilter === option.key && styles.filterOptionSelected,
                ]}
                onPress={() => setDateFilter(option.key)}
              >
                <View style={styles.filterOptionLeft}>
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={dateFilter === option.key ? "#3b82f6" : "#6b7280"}
                  />
                  <Text
                    style={[
                      styles.filterOptionText,
                      dateFilter === option.key &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {dateFilter === option.key && (
                  <Ionicons name="checkmark" size={18} color="#3b82f6" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSortBy("newest");
              setDateFilter("all");
              setSearch("");
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#ef4444" />
            <Text style={styles.resetButtonText}>Reset All Filters</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCard = ({ item }) => {
    const thumbnail = thumbnails[item.id];
    const hasFile = !!item.file;

    return (
      <TouchableOpacity
        onPress={() => openPreview(item)}
        style={styles.cardContainer}
        activeOpacity={0.7}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              {hasFile ? (
                thumbnail?.type === "image" ? (
                  <Image
                    source={{ uri: thumbnail.uri }}
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
                  {new Date(item.created).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>

          {hasFile && (
            <View style={styles.filePreviewContainer}>
              <Text style={styles.filePreviewText}>
                {thumbnail?.type === "image" ? "Image" : "PDF Document"}{" "}
                attached
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.tagContainer}>
              <Text style={styles.tag}>Press Release</Text>
            </View>
            <View style={styles.cardActions}>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPreviewModal = () => (
    <Modal
      visible={previewVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closePreview}
    >
      {previewItem && (
        <View style={styles.previewModalContainer}>
          <View style={styles.previewHeader}>
            <View style={styles.previewHeaderLeft}>
              <TouchableOpacity
                onPress={closePreview}
                style={styles.backButton}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.previewTitle}>Preview</Text>
            </View>
            {previewItem.file && (
              <TouchableOpacity
                onPress={() => downloadFile(getFileUrl(previewItem))}
                style={styles.downloadButton}
              >
                <Ionicons name="download-outline" size={18} color="#3b82f6" />
                <Text style={styles.downloadButtonText}>Download</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.previewContent}>
            <View style={styles.previewArticleHeader}>
              <Text style={styles.previewArticleTitle}>
                {previewItem.title}
              </Text>
              <View style={styles.previewMeta}>
                <Ionicons name="time-outline" size={16} color="#6b7280" />
                <Text style={styles.previewDate}>
                  {new Date(previewItem.created).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>

            {/* File Preview Section */}
            {previewItem.file && (
              <View style={styles.filePreviewSection}>
                <Text style={styles.sectionTitle}>Attachment</Text>
                {getFileType(getFileUrl(previewItem)) === "image" ? (
                  <Image
                    source={{ uri: getFileUrl(previewItem) }}
                    style={styles.fullPreviewImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.pdfPreviewContainer}>
                    <Ionicons name="document" size={48} color="#3b82f6" />
                    <Text style={styles.pdfPreviewText}>PDF Document</Text>
                    <TouchableOpacity
                      style={styles.viewPdfButton}
                      onPress={() => Linking.openURL(getFileUrl(previewItem))}
                    >
                      <Text style={styles.viewPdfButtonText}>View PDF</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {previewItem.description && (
              <View style={styles.previewDescription}>
                <Text style={styles.previewDescriptionText}>
                  {previewItem.description.replace(/<[^>]*>/g, "")}
                </Text>
              </View>
            )}

            {previewItem.content && (
              <View style={styles.previewBody}>
                <Text style={styles.previewBodyTitle}>Content</Text>
                <Text style={styles.previewBodyText}>
                  {previewItem.content
                    .replace(/<[^>]*>/g, "")
                    .substring(0, 500)}
                  {previewItem.content.length > 500 && "..."}
                </Text>
              </View>
            )}

            <View style={styles.previewFooter}>
              <Text style={styles.previewFooterText}>
                {previewItem.file
                  ? "Download the file for full details"
                  : "View full details for complete information"}
              </Text>
            </View>
          </ScrollView>
        </View>
      )}
    </Modal>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#6b7280"
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="Search press releases..."
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(true)}
      >
        <Ionicons name="options-outline" size={18} color="#3b82f6" />
        <Text style={styles.filterButtonText}>Filter</Text>
        {(sortBy !== "newest" || dateFilter !== "all") && (
          <View style={styles.filterIndicator} />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="newspaper-outline" size={48} color="#d1d5db" />
      </View>
      <Text style={styles.emptyTitle}>
        {search || dateFilter !== "all"
          ? "No matching articles"
          : "No press releases available"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {search || dateFilter !== "all"
          ? "Try adjusting your search terms or filters"
          : "Check back later for new press releases"}
      </Text>
    </View>
  );

  const renderStats = () => {
    if (loading || filteredNews.length === 0) return null;

    const hasFilters = search || sortBy !== "newest" || dateFilter !== "all";

    return (
      <View>
        {hasFilters && (
          <TouchableOpacity
            onPress={() => {
              setSearch("");
              setSortBy("newest");
              setDateFilter("all");
            }}
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <CustomHeader
        title="Press Releases"
        subtitle="Official announcements and updates from ZRP"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
      />

      {renderHeader()}

      {renderStats()}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading press releases...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={[
            styles.listContainer,
            filteredNews.length === 0 && styles.emptyListContainer,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3b82f6"]}
              tintColor="#3b82f6"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderFilterModal()}
      {renderPreviewModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    gap: 6,
    position: "relative",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  filterIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  clearFiltersButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
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
  description: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 16,
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
  previewText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: "#eff6ff",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterOptionText: {
    fontSize: 15,
    color: "#374151",
  },
  filterOptionTextSelected: {
    color: "#3b82f6",
    fontWeight: "500",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginVertical: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    gap: 8,
  },
  resetButtonText: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "500",
  },
  // Preview Modal Styles
  previewModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  previewHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  fullViewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 6,
  },
  fullViewButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  previewArticleHeader: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  previewArticleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 28,
    marginBottom: 12,
  },
  previewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewDate: {
    fontSize: 14,
    color: "#6b7280",
  },
  previewDescription: {
    paddingVertical: 16,
  },
  previewDescriptionText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  previewBody: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  previewBodyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  previewBodyText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  previewFooter: {
    paddingVertical: 20,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  previewFooterText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  filePreviewContainer: {
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  filePreviewText: {
    fontSize: 13,
    color: "#4b5563",
    marginLeft: 8,
  },
  filePreviewSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  fullPreviewImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
  },
  pdfPreviewContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  pdfPreviewText: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 8,
  },
  viewPdfButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 6,
  },
  viewPdfButtonText: {
    color: "white",
    fontWeight: "500",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 6,
  },
  downloadButtonText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
});

export default News;
