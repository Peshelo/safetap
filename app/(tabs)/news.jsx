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
  Image,
  Linking,
  Platform,
  Alert,
  Animated,
  Share,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import api from "../../lib/connection";
import { Ionicons } from "../components/Icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomHeader from "../components/Header";
import SmoothBottomSheet from "../components/SmoothBottomSheet";
import ArticleImage, { FALLBACK_IMAGE } from "../components/ArticleImage";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PAGE_SIZE = 10;
const NEWS_CACHE_KEY = "safetap_news_cache_v2";
const DarkImageGradient = () => <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: 10 }).map((_, index) => <View key={index} style={{ position: "absolute", left: 0, right: 0, bottom: `${index * 7}%`, height: "15%", backgroundColor: `rgba(4,12,28,${Math.max(0.03, 0.72 - index * 0.075)})` }} />)}</View>;

const StoriesRail = ({ items, getImageUrl, onOpen }) => (
  <View style={styles.storiesSection}>
    <View style={styles.storiesHeadingRow}>
      <View>
        <Text style={styles.storiesEyebrow}>ZRP NEWSROOM</Text>
        <Text style={styles.storiesTitle}>Stories</Text>
      </View>
      <Text style={styles.storiesHint}>Tap to read</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContent}>
      {items.map((item, index) => (
        <TouchableOpacity key={item.id} style={styles.storyItem} activeOpacity={0.82} onPress={() => onOpen(item)}>
          <View style={[styles.storyRing, index === 0 && styles.storyRingFeatured]}>
            <ArticleImage source={getImageUrl(item) ? { uri: getImageUrl(item) } : FALLBACK_IMAGE} style={styles.storyImage} resizeMode="cover" />
            {index === 0 && <View style={styles.storyLiveDot} />}
          </View>
          <Text style={styles.storyLabel} numberOfLines={2}>{item.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [storyVisible, setStoryVisible] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const fetchingRef = useRef(false);
  const storyProgress = useRef(new Animated.Value(0)).current;
  const storyTransition = useRef(new Animated.Value(1)).current;
  const storyItems = filteredNews.slice(0, 7);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchNews = async (page = 1, isRefresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);

      const records = await api.collection("news").getList(page, PAGE_SIZE, {
        sort: sortBy === "newest" ? "-created" : "created",
      });
      setOfflineMode(false);

      if (isRefresh || page === 1) {
        setNews(records.items);
        setFilteredNews(records.items);
        await AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(records.items.slice(0, 50)));
      } else {
        setNews((prev) => {
          const combined = [...prev, ...records.items.filter((item) => !prev.some((existing) => existing.id === item.id))];
          AsyncStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(combined.slice(0, 50))).catch(() => {});
          return combined;
        });
        setFilteredNews((prev) => [...prev, ...records.items]);
      }

      setHasMore(records.page < records.totalPages);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to fetch news", err);
      setOfflineMode(true);
      setHasMore(false);
      if (page === 1) {
        try {
          const cached = JSON.parse((await AsyncStorage.getItem(NEWS_CACHE_KEY)) || "[]");
          if (Array.isArray(cached) && cached.length) {
            setNews(cached);
            setFilteredNews(cached);
          }
        } catch (cacheError) {
          console.warn("Unable to read cached news", cacheError);
        }
      }
    } finally {
      fetchingRef.current = false;
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
    if (!hasMore || loadingMore || offlineMode || fetchingRef.current) return;
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
      return matchSearch;
    });
    setFilteredNews(filtered);
  }, [search, news]);

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
      "press release": "#DC2626",
      "public notice": "#7C3AED",
      alert: "#1E3A8A",
    };
    return map[(cat || "press release").toLowerCase()] || "#1E3A8A";
  };

  const getCategoryIcon = (cat) => {
    const map = {
      "press release": "newspaper-outline",
      "public notice": "megaphone-outline",
      alert: "warning-outline",
    };
    return map[(cat || "press release").toLowerCase()] || "document-text-outline";
  };

  // Share article text through the native platform share sheet.
  const closeStories = () => {
    storyProgress.stopAnimation();
    setStoryVisible(false);
  };

  const openStory = (item) => {
    const index = storyItems.findIndex((story) => story.id === item.id);
    setActiveStoryIndex(Math.max(index, 0));
    setStoryVisible(true);
  };

  const changeStory = useCallback((direction) => {
    setActiveStoryIndex((current) => {
      const next = current + direction;
      if (next < 0) return 0;
      if (next >= storyItems.length) {
        setStoryVisible(false);
        return current;
      }
      return next;
    });
  }, [storyItems.length]);

  useEffect(() => {
    if (!storyVisible || !storyItems.length) return undefined;
    storyProgress.setValue(0);
    storyTransition.setValue(0);
    Animated.timing(storyTransition, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const animation = Animated.timing(storyProgress, { toValue: 1, duration: 6000, useNativeDriver: false });
    animation.start(({ finished }) => { if (finished) changeStory(1); });
    return () => animation.stop();
  }, [storyVisible, activeStoryIndex, storyItems.length, changeStory]);

  const shareArticle = async (article) => {
    if (!article) return;
    
    setSharing(true);
    try {
      const description = article.description?.replace(/<[^>]*>/g, "") || "Read more";
      const shareText = `${article.title}\n\n${description}\n\nShared via SafeTap — Zimbabwe Republic Police`;
      
      await Share.share({ title: article.title, message: shareText });
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
      today: { title: "Today", icon: "sunny-outline", color: "#1E3A8A" },
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
    const relativeDate = formatRelativeDate(item.created);
    const imageUrl = getImageUrl(item);

    return (
      <TouchableOpacity
        style={styles.newsCard}
        onPress={() => router.push(`/press-release/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={styles.newsCardRow}>
        <ArticleImage source={imageUrl ? { uri: imageUrl } : FALLBACK_IMAGE} style={styles.newsThumbnail} resizeMode="cover" />
        <View style={styles.newsContent}>
          <View style={styles.newsHeader}>
            <Text style={styles.newsCategory}>OFFICIAL UPDATE</Text>
            <Text style={styles.newsDate}>{relativeDate}</Text>
          </View>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.newsExcerpt} numberOfLines={1}>
            {item.description?.replace(/<[^>]*>/g, "") || "Click to read more..."}
          </Text>
          <View style={styles.newsFooter}>
            <Text style={styles.publisherText}>ZRP Newsroom</Text>
            {Number(item.view_count) > 0 && <Text style={styles.viewCount}>{item.view_count} views</Text>}
          </View>
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FeaturedStory = ({ item }) => {
    const imageUrl = getImageUrl(item);
    return (
      <TouchableOpacity
        style={styles.featuredCard}
        activeOpacity={0.92}
        onPress={() => router.push(`/press-release/${item.id}`)}
      >
        <ArticleImage source={imageUrl ? { uri: imageUrl } : FALLBACK_IMAGE} style={styles.featuredImage} resizeMode="cover" />
        <DarkImageGradient />
        <View style={styles.featuredContent}>
          <View style={styles.featuredKickerRow}>
            <Text style={styles.featuredKicker}>TOP STORY</Text>
            <Text style={styles.featuredDate}>{formatRelativeDate(item.created)}</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={3}>{item.title}</Text>
          <View style={styles.featuredFooter}>
            <View style={styles.readStoryAction}>
              <Text style={styles.readStoryText}>Read story</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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
  const renderStoryViewer = () => {
    const story = storyItems[activeStoryIndex];
    if (!story) return null;
    const imageUrl = getImageUrl(story);
    const progressWidth = storyProgress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

    return (
      <Modal visible={storyVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeStories}>
        <View style={styles.storyViewer}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: storyTransition }]}>
            <ArticleImage source={imageUrl ? { uri: imageUrl } : FALLBACK_IMAGE} style={styles.storyViewerImage} resizeMode="cover" />
            <DarkImageGradient />
          </Animated.View>
          <View pointerEvents="none" style={styles.storyTopShade} />
          <View style={[styles.storyViewerHeader, { paddingTop: insets.top + 10 }]}>
            <View style={styles.storyProgressRow}>
              {storyItems.map((item, index) => (
                <View key={item.id} style={styles.storyProgressTrack}>
                  {index < activeStoryIndex && <View style={styles.storyProgressComplete} />}
                  {index === activeStoryIndex && <Animated.View style={[styles.storyProgressActive, { width: progressWidth }]} />}
                </View>
              ))}
            </View>
            <View style={styles.storyViewerNav}>
              <View style={styles.storyPublisherRow}>
                <View style={styles.storyPublisherMark}><Ionicons name="shield" size={14} color="#FFFFFF" /></View>
                <Text style={styles.storyPublisherName}>ZRP Newsroom</Text>
                <Text style={styles.storyViewerDate}>{formatRelativeDate(story.created)}</Text>
              </View>
              <View style={styles.storyHeaderActions}>
                <TouchableOpacity style={styles.storyIconButton} onPress={() => shareArticle(story)} disabled={sharing}>
                  {sharing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.storyIconButton} onPress={closeStories}><Ionicons name="close" size={24} color="#FFFFFF" /></TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.storyPreviousZone} activeOpacity={1} onPress={() => changeStory(-1)} />
          <TouchableOpacity style={styles.storyNextZone} activeOpacity={1} onPress={() => changeStory(1)} />
          <Animated.View style={[styles.storyViewerContent, { paddingBottom: insets.bottom + 24, opacity: storyTransition }]}>
            <Text style={styles.storyViewerLabel}>OFFICIAL UPDATE</Text>
            <Text style={styles.storyViewerTitle}>{story.title}</Text>
            <Text style={styles.storyViewerExcerpt} numberOfLines={3}>{story.description?.replace(/<[^>]*>/g, "") || "Read the full update from the ZRP newsroom."}</Text>
            <TouchableOpacity style={styles.viewArticleButton} activeOpacity={0.86} onPress={() => { closeStories(); router.push(`/press-release/${story.id}`); }}>
              <Text style={styles.viewArticleText}>View article</Text>
              <Ionicons name="arrow-forward" size={17} color="#1E3A8A" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    );
  };

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

  const timelineRows = [];
  let previousTimelineLabel = null;
  filteredNews.slice(1).forEach((item) => {
    const date = new Date(item.created);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const articleDay = Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const difference = articleDay ? Math.round((today - articleDay) / 86400000) : null;
    const label = difference === 0
      ? `Today · ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
      : difference === 1
        ? `Yesterday · ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
        : articleDay
          ? date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
          : "Earlier stories";
    if (label !== previousTimelineLabel) {
      timelineRows.push({ rowType: "section", id: `section-${label}`, label });
      previousTimelineLabel = label;
    }
    timelineRows.push({ rowType: "article", ...item });
  });

  // ── Main Render ───────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <CustomHeader title="News" subtitle="Zimbabwe Republic Police" showLogo compact rightComponent={(
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
            {sortBy !== "newest" && (
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

      {offlineMode && <TouchableOpacity style={styles.offlineBanner} onPress={onRefresh} activeOpacity={0.8}><Ionicons name="cloud-offline-outline" size={17} color="#1E3A8A" /><View style={{flex:1}}><Text style={styles.offlineTitle}>Showing saved news</Text><Text style={styles.offlineText}>No connection. Pull down or tap here to try again.</Text></View></TouchableOpacity>}

      {/* Active Filters */}
      {search ? (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersLabel}>Active filters:</Text>
          <View style={styles.filterChips}>
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
      ) : null}

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
          data={timelineRows}
          keyExtractor={(item) => item.rowType === "section" ? item.id : `article-${item.id}`}
          renderItem={({ item }) => item.rowType === "section"
            ? <View style={styles.timelineHeader}><Text style={styles.timelineTitle}>{item.label}</Text></View>
            : <NewsCard item={item} />}
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
                <StoriesRail items={storyItems} getImageUrl={getImageUrl} onOpen={openStory} />
                <FeaturedStory item={filteredNews[0]} />
                <View style={styles.latestHeader}>
                  <Text style={styles.latestTitle}>More from the newsroom</Text>
                  <Text style={styles.resultsText}>{Math.max(filteredNews.length - 1, 0)} stories</Text>
                </View>
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
                  {search
                    ? "Try adjusting your search or filters"
                    : "Check back later for updates"}
                </Text>
                {search && (
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
      {renderStoryViewer()}
      <ArticleModal />
      <FilterModal />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
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
    backgroundColor: "#FFFFFF",
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
  offlineBanner: { marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 10, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", flexDirection: "row", alignItems: "center", gap: 9 },
  offlineTitle: { color: "#1E3A8A", fontSize: 12, fontFamily: "GoogleSans_600SemiBold" },
  offlineText: { color: "#475569", fontSize: 10.5, marginTop: 1 },
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
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
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
    backgroundColor: "transparent",
    borderRadius: 0,
    marginBottom: 0,
    overflow: "hidden",
    elevation: 0,
    borderBottomWidth: 1,
    borderColor: "#DDE3EA",
  },
  newsCardRow: { flexDirection: "row", alignItems: "center", paddingVertical: 15, gap: 14 },
  newsContent: {
    flex: 1,
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
  newsCategory: { fontSize: 9, color: "#1E3A8A", fontWeight: "800", letterSpacing: 0.9 },
  newsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 21,
    marginBottom: 5,
  },
  newsExcerpt: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginBottom: 8,
  },
  newsFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  plainCategory: { fontSize: 9, fontWeight: "700", color: "#475569", letterSpacing: 0.8 },
  publisherText: { fontSize: 11, fontWeight: "700", color: "#1E3A8A" },
  viewCount: { fontSize: 10, color: "#94A3B8" },
  newsThumbnail: { width: 104, height: 104, borderRadius: 14, backgroundColor: "#E2E8F0" },
  timelineHeader: { paddingTop: 24, paddingHorizontal: 2, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#CBD5E1" },
  timelineTitle: { fontSize: 14, fontWeight: "800", color: "#0F172A", letterSpacing: -0.1 },
  storiesSection: { marginBottom: 20, marginHorizontal: -16 },
  storiesHeadingRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 13 },
  storiesEyebrow: { fontSize: 9, fontWeight: "800", color: "#1E3A8A", letterSpacing: 1.25, marginBottom: 2 },
  storiesTitle: { fontSize: 23, fontWeight: "800", color: "#0F172A", letterSpacing: -0.5 },
  storiesHint: { fontSize: 11, color: "#64748B", marginBottom: 3 },
  storiesContent: { paddingHorizontal: 16, gap: 13 },
  storyItem: { width: 72, alignItems: "center" },
  storyRing: { width: 68, height: 68, borderRadius: 34, padding: 3, borderWidth: 2, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", position: "relative" },
  storyRingFeatured: { borderColor: "#1E3A8A" },
  storyImage: { width: "100%", height: "100%", borderRadius: 30, backgroundColor: "#E2E8F0" },
  storyLiveDot: { position: "absolute", right: 1, bottom: 4, width: 13, height: 13, borderRadius: 7, backgroundColor: "#1E3A8A", borderWidth: 2, borderColor: "#FFFFFF" },
  storyLabel: { fontSize: 10, lineHeight: 13, fontWeight: "600", color: "#334155", textAlign: "center", marginTop: 6 },
  readMoreLink: {
    fontSize: 12,
    fontWeight: "600",
  },
  featuredCard: {
    backgroundColor: "#0F172A",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 26, height: 360, position: "relative",
    elevation: 0,
  },
  featuredImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", backgroundColor: "#E2E8F0" },
  featuredContent: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 22 },
  featuredKickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  featuredKicker: { fontSize: 10, fontWeight: "800", color: "#FFFFFF", letterSpacing: 1.2 },
  featuredDate: { fontSize: 12, color: "#E2E8F0" },
  featuredTitle: { fontSize: 27, lineHeight: 32, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.55 },
  featuredExcerpt: { fontSize: 14, lineHeight: 21, color: "#64748B", marginTop: 10 },
  featuredFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginTop: 16 },
  readStoryAction: { flexDirection: "row", alignItems: "center", gap: 5 },
  readStoryText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  latestHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 },
  latestTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3, flexShrink: 1 },
  storyViewer: { flex: 1, backgroundColor: "#071329" },
  storyViewerImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", backgroundColor: "#0F172A" },
  storyTopShade: { position: "absolute", left: 0, right: 0, top: 0, height: 180, backgroundColor: "rgba(4,12,28,0.34)" },
  storyViewerHeader: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 12, zIndex: 4 },
  storyProgressRow: { flexDirection: "row", gap: 4 },
  storyProgressTrack: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.38)" },
  storyProgressComplete: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF" },
  storyProgressActive: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#FFFFFF" },
  storyViewerNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  storyPublisherRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  storyPublisherMark: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#1E3A8A", borderWidth: 1, borderColor: "rgba(255,255,255,0.55)" },
  storyPublisherName: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  storyViewerDate: { color: "rgba(255,255,255,0.72)", fontSize: 11 },
  storyHeaderActions: { flexDirection: "row", gap: 4 },
  storyIconButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(4,12,28,0.34)" },
  storyPreviousZone: { position: "absolute", left: 0, top: 100, bottom: 220, width: "36%", zIndex: 2 },
  storyNextZone: { position: "absolute", right: 0, top: 100, bottom: 220, width: "64%", zIndex: 2 },
  storyViewerContent: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, zIndex: 3 },
  storyViewerLabel: { color: "rgba(255,255,255,0.78)", fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 9 },
  storyViewerTitle: { color: "#FFFFFF", fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6 },
  storyViewerExcerpt: { color: "rgba(255,255,255,0.84)", fontSize: 14, lineHeight: 21, marginTop: 10 },
  viewArticleButton: { height: 50, marginTop: 20, borderRadius: 25, backgroundColor: "#FFFFFF", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  viewArticleText: { color: "#1E3A8A", fontSize: 14, fontWeight: "800" },
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
