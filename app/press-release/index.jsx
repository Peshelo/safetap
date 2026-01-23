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
  KeyboardAvoidingView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import pb from "../../lib/connection";
import { Ionicons } from "@expo/vector-icons";
import CustomHeader from "../components/Header";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
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
      const records = await pb.collection("news").getFullList({ sort: "-created" });
      setNews(records);
      setFilteredNews(records);

      // Generate thumbnails for each item with a file
      records.forEach((item) => {
        if (item.file) generateThumbnail(item);
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

  const getFileUrl = (item) => (item.file ? pb.files.getURL(item, item.file) : null);

  const getFileType = (url) => {
    if (!url) return null;
    const ext = url.split(".").pop().toLowerCase();
    if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return null;
  };

  const downloadFile = async (url) => {
    try {
      const type = getFileType(url);
      if (!type) return;

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        FileSystem.documentDirectory +
          `download_${Date.now()}.${type === "image" ? "jpg" : "pdf"}`
      );

      const { uri } = await downloadResumable.downloadAsync();

      if (Platform.OS === "android") {
        IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: uri,
          flags: 1,
          type: type === "image" ? "image/jpeg" : "application/pdf",
        });
      } else {
        await Linking.openURL(uri);
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const generateThumbnail = async (item) => {
    if (!item.file || thumbnailLoading[item.id]) return;
    setThumbnailLoading((prev) => ({ ...prev, [item.id]: true }));

    try {
      const fileUrl = getFileUrl(item);
      const type = getFileType(fileUrl);

      if (type === "image") {
        setThumbnails((prev) => ({ ...prev, [item.id]: { type, uri: fileUrl } }));
      } else if (type === "pdf") {
        setThumbnails((prev) => ({ ...prev, [item.id]: { type, uri: null } }));
      }
    } catch (err) {
      console.error("Thumbnail generation failed", err);
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

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(lower) ||
          item.description?.toLowerCase().includes(lower)
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case "today":
        filtered = filtered.filter((item) => new Date(item.created) >= today);
        break;
      case "week":
        filtered = filtered.filter((item) => new Date(item.created) >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case "month":
        filtered = filtered.filter((item) => new Date(item.created) >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      case "year":
        filtered = filtered.filter((item) => new Date(item.created) >= new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000));
        break;
    }

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

  // Active filter chips
  const renderActiveFilters = () => {
    const chips = [];
    if (search) chips.push({ label: `Search: ${search}`, onRemove: () => setSearch("") });
    if (sortBy !== "newest") chips.push({ label: `Sort: ${sortBy}`, onRemove: () => setSortBy("newest") });
    if (dateFilter !== "all") chips.push({ label: `Date: ${dateFilter}`, onRemove: () => setDateFilter("all") });

    if (chips.length === 0) return null;

    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, marginBottom: 8, gap: 8 }}>
        {chips.map((chip, idx) => (
          <TouchableOpacity key={idx} style={styles.filterChip} onPress={chip.onRemove}>
            <Text style={styles.filterChipText}>{chip.label}</Text>
            <Ionicons name="close-circle" size={16} color="#fff" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter & Sort</Text>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          <Text style={styles.filterSectionTitle}>Sort By</Text>
          {[
            { key: "newest", label: "Newest First" },
            { key: "oldest", label: "Oldest First" },
            { key: "title", label: "Title (A-Z)" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterOption, sortBy === opt.key && styles.filterOptionSelected]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[styles.filterOptionText, sortBy === opt.key && styles.filterOptionTextSelected]}>{opt.label}</Text>
              {sortBy === opt.key && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
            </TouchableOpacity>
          ))}

          <Text style={[styles.filterSectionTitle, { marginTop: 24 }]}>Date Range</Text>
          {[
            { key: "all", label: "All Time" },
            { key: "today", label: "Today" },
            { key: "week", label: "Last 7 Days" },
            { key: "month", label: "Last 30 Days" },
            { key: "year", label: "Last Year" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterOption, dateFilter === opt.key && styles.filterOptionSelected]}
              onPress={() => setDateFilter(opt.key)}
            >
              <Text style={[styles.filterOptionText, dateFilter === opt.key && styles.filterOptionTextSelected]}>{opt.label}</Text>
              {dateFilter === opt.key && <Ionicons name="checkmark" size={18} color="#3b82f6" />}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.resetButton, { marginTop: 32 }]}
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
      <TouchableOpacity onPress={() => openPreview(item)} style={styles.cardContainer} activeOpacity={0.7}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              {hasFile ? (thumbnail?.type === "image" ? <Image source={{ uri: thumbnail.uri }} style={styles.thumbnailImage} /> : <Ionicons name="document" size={24} color="#3b82f6" />) : <Ionicons name="document-text" size={24} color="#3b82f6" />}
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <View style={styles.metaContainer}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.dateText}>{new Date(item.created).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</Text>
              </View>
            </View>
          </View>
          {hasFile && <View style={styles.filePreviewContainer}><Text style={styles.filePreviewText}>{thumbnail?.type === "image" ? "Image" : "PDF Document"} attached</Text></View>}
          <View style={styles.cardFooter}>
            <View style={styles.tagContainer}><Text style={styles.tag}>Press Release</Text></View>
            <View style={styles.cardActions}><Ionicons name="chevron-forward" size={16} color="#9ca3af" /></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CustomHeader
        title="Press Releases"
        subtitle="Official announcements and updates from ZRP"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Search & Filters */}
        <View style={styles.header}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#6b7280" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search press releases..."
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#9ca3af"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={18} color="#3b82f6" />
            <Text style={styles.filterButtonText}>Filter</Text>
            {(sortBy !== "newest" || dateFilter !== "all") && <View style={styles.filterIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips */}
        {renderActiveFilters()}

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
            contentContainerStyle={[styles.listContainer, filteredNews.length === 0 && { flexGrow: 1 }]}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}><Ionicons name="newspaper-outline" size={48} color="#d1d5db" /></View>
                <Text style={styles.emptyTitle}>{search || dateFilter !== "all" ? "No matching articles" : "No press releases available"}</Text>
                <Text style={styles.emptySubtitle}>{search || dateFilter !== "all" ? "Try adjusting your search terms or filters" : "Check back later for new press releases"}</Text>
              </View>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3b82f6"]} tintColor="#3b82f6" />}
            showsVerticalScrollIndicator={false}
          />
        )}

        {renderFilterModal()}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 12 },
  searchContainer: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 16, color: "#374151", paddingVertical: 0 },
  filterButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#eff6ff", borderRadius: 8, gap: 6, position: "relative" },
  filterButtonText: { fontSize: 14, color: "#3b82f6", fontWeight: "500" },
  filterIndicator: { position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  filterChip: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 8, backgroundColor: "#3b82f6", borderRadius: 12 },
  filterChipText: { color: "#fff", fontSize: 12, marginRight: 4, fontWeight: "500" },
  listContainer: { padding: 16, paddingBottom: 32 },
  cardContainer: { marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: "#f1f5f9" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardHeaderText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "600", color: "#111827", lineHeight: 22, marginBottom: 4 },
  metaContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tagContainer: { backgroundColor: "#bfdbfe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tag: { fontSize: 11, color: "#0284c7", fontWeight: "600", textTransform: "uppercase" },
  cardActions: {},
  thumbnailImage: { width: 32, height: 32, borderRadius: 6 },
  filePreviewContainer: { paddingVertical: 4 },
  filePreviewText: { fontSize: 12, color: "#6b7280" },
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  filterSectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  filterOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: "#f3f4f6" },
  filterOptionSelected: { backgroundColor: "#e0f2fe" },
  filterOptionText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  filterOptionTextSelected: { color: "#1d4ed8" },
  resetButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#fee2e2", borderRadius: 12 },
  resetButtonText: { color: "#b91c1c", fontSize: 14, fontWeight: "600" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#6b7280" },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyIconContainer: { marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#374151", marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: "#6b7280", textAlign: "center" },
});

export default News;
