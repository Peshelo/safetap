import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Modal,
  FlatList,
  useWindowDimensions,
  Share,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons } from "../components/Icons";
import api from "../../lib/connection";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import ArticleImage, { FALLBACK_IMAGE } from "../components/ArticleImage";
import CustomHeader from "../components/Header";

const articleHtmlToText = (html = "") => html
  .replace(/<\s*br\s*\/?\s*>/gi, "\n")
  .replace(/<\/(p|div|h[1-6]|blockquote)>/gi, "\n\n")
  .replace(/<li[^>]*>/gi, "• ")
  .replace(/<\/li>/gi, "\n")
  .replace(/<[^>]*>/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const ProportionalArticleImage = ({ source, style }) => {
  const [aspectRatio, setAspectRatio] = useState(16 / 10);

  useEffect(() => {
    const uri = source && typeof source === "object" ? source.uri : null;
    if (uri) {
      Image.getSize(uri, (imageWidth, imageHeight) => {
        if (imageWidth > 0 && imageHeight > 0) setAspectRatio(imageWidth / imageHeight);
      }, () => setAspectRatio(16 / 10));
      return;
    }
    const asset = Image.resolveAssetSource(source || FALLBACK_IMAGE);
    if (asset?.width && asset?.height) setAspectRatio(asset.width / asset.height);
  }, [source]);

  return <ArticleImage source={source} style={[styles.proportionalImage, { aspectRatio }, style]} resizeMode="contain" />;
};

export default function NewsDetails() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter(); 
  const { width: viewportWidth } = useWindowDimensions();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [featuredImage, setFeaturedImage] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);

  useEffect(() => {
    if (id) fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const record = await api.collection("news").getOne(id);
      setArticle(record);
      api.trackEvent({ event_type: "ARTICLE_VIEW", feature_name: "article_view", entity_id: record.id });

      const processed = [];

      if (record.file) {
        const url = api.files.getURL(record, record.file);
        const isImage = Boolean(record.cover_image_url) || /\.(jpg|jpeg|png|gif|webp|bmp)(?:\?|$)/i.test(record.file);
        if (isImage) setFeaturedImage({ filename: record.file, url });
        else processed.push({ type: "document", filename: record.file, url });
      } else {
        setFeaturedImage(null);
      }

      if (Array.isArray(record.attachments)) {
        record.attachments.forEach((attachment) => {
          const source = typeof attachment === "string" ? attachment : attachment.url;
          if (!source) return;
          const name = typeof attachment === "string" ? attachment.split("/").pop() : (attachment.name || source.split("/").pop());
          const url = api.files.getURL(record, source);
          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)(?:\?|$)/i.test(source);

          processed.push({
            type: isImage ? "image" : "document",
            filename: name,
            url,
          });
        });
      }

      setAttachments(processed);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load article");
    } finally {
      setLoading(false);
    }
  };

  const shareArticle = async () => {
    try {
      if (!article) return;

      const description = articleHtmlToText(article.description ?? "");
      await Share.share({
        title: article.title,
        message: `${article.title}\n\n${description}\n\nShared via SafeTap — Zimbabwe Republic Police`,
      });
    } catch (e) {
      Alert.alert("Error", "Unable to share article");
    }
  };

  const images = attachments.filter((a) => a.type === "image");
  const documents = attachments.filter((a) => a.type === "document");
  const publishedDate = article?.created ? new Date(article.created) : null;
  const hasValidPublishedDate = publishedDate && !Number.isNaN(publishedDate.getTime());

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading article…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CustomHeader
        title="News & Press"
        subtitle="Official Zimbabwe Republic Police update"
        showBackButton
        onBack={() => router.back()}
        compact
        rightComponent={<TouchableOpacity onPress={shareArticle} style={styles.sharedHeaderAction}><Ionicons name="share-social-outline" size={21} color="#FFFFFF" /></TouchableOpacity>}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {/* Editorial hero with the image shown at its original proportions. */}
        <TouchableOpacity
          disabled={!featuredImage}
          activeOpacity={featuredImage ? 0.92 : 1}
          onPress={() => {
            setSelectedImage(featuredImage?.url);
            setViewerImages(featuredImage ? [featuredImage] : []);
            setViewerIndex(0);
            setViewerStartIndex(0);
            setImageViewerVisible(true);
          }}
          style={styles.mainImageContainer}
        >
          <ArticleImage source={featuredImage ? { uri: featuredImage.url } : FALLBACK_IMAGE} style={styles.featuredHeroImage} resizeMode="cover" />
          <View style={styles.heroCaption}>
            <View pointerEvents="none" style={styles.heroGradient}>
              {[0.02, 0.06, 0.12, 0.22, 0.36, 0.52, 0.66, 0.78].map((opacity, index) => (
                <View key={index} style={[styles.heroGradientBand, { backgroundColor: `rgba(7,18,39,${opacity})` }]} />
              ))}
            </View>
            <Text style={styles.heroTitle}>{article.title}</Text>
            <Text style={styles.heroMeta}>
              {hasValidPublishedDate ? publishedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Date unavailable"}
              {Number(article.view_count) > 0 ? `  ·  ${article.view_count} views` : ""}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Article text */}
        <View style={styles.articleBody}>
        {article.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.description}>{article.description.replace(/<[^>]*>/g, "")}</Text>
          </View>
        )}
        {article.content && (
          <View style={styles.contentSection}><Text style={styles.contentText}>{articleHtmlToText(article.content)}</Text></View>
        )}
        </View>

        {/* Uploaded attachment images are displayed in their saved order. */}
        {images.length > 0 && <View style={styles.attachmentSection}>
          <Text style={styles.sectionTitle}>Attached images</Text>
          <View style={styles.attachmentGallery}>
            {images.map((image, index) => (
              <TouchableOpacity
                key={`${image.url || "fallback"}-${index}`}
                activeOpacity={image.url ? 0.92 : 1}
                disabled={!image.url}
                onPress={() => {
                  setSelectedImage(image.url);
                  setViewerImages(images);
                  setViewerIndex(index);
                  setViewerStartIndex(index);
                  setImageViewerVisible(true);
                }}
                style={styles.attachmentImageCard}
              >
                <ProportionalArticleImage source={image.url ? { uri: image.url } : FALLBACK_IMAGE} />
                <View style={styles.attachmentNumber}><Text style={styles.attachmentNumberText}>{index + 1} / {images.length}</Text></View>
              </TouchableOpacity>
            ))}
          </View>
        </View>}

        {/* Documents Section */}
        {documents.length > 0 && (
          <View style={styles.documentsSection}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            {documents.map((doc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.documentItem}
                onPress={() => Linking.openURL(doc.url)}
                activeOpacity={0.7}
              >
                <View style={styles.documentIcon}>
                  <Ionicons name="insert-drive-file" size={20} color="#1E3A8A" />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {doc.filename}
                  </Text>
                  <Text style={styles.documentType}>{doc.filename.split(".").pop().toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e0" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal visible={imageViewerVisible} transparent>
        <View style={styles.viewer}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setImageViewerVisible(false)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {viewerImages.length > 0 && (
            <FlatList
              key={`viewer-${viewerImages[0]?.url}-${viewerStartIndex}-${viewportWidth}`}
              data={viewerImages}
              horizontal
              pagingEnabled
              initialScrollIndex={viewerStartIndex}
              getItemLayout={(_, index) => ({ length: viewportWidth, offset: viewportWidth * index, index })}
              keyExtractor={(item, index) => `${item.url}-${index}`}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => setViewerIndex(Math.round(event.nativeEvent.contentOffset.x / viewportWidth))}
              renderItem={({ item }) => (
                <View style={[styles.viewerSlide, { width: viewportWidth }]}>
                  <Image source={{ uri: item.url }} style={styles.fullImage} resizeMode="contain" />
                </View>
              )}
            />
          )}
          {viewerImages.length > 1 && <View style={styles.viewerCounter}><Text style={styles.viewerCounterText}>{viewerIndex + 1} / {viewerImages.length}</Text></View>}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8fafc" 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 12,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E3A8A",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Content
  scrollContent: {
    flex: 1,
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  // Category
  categoryBadge: {
    alignSelf: "flex-start",
    marginHorizontal: 20,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E3A8A",
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E3A8A",
    textTransform: "uppercase",
  },
  // Title
  title: {
    fontSize: 26,
    fontWeight: "800",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    color: "#0f172a",
    lineHeight: 32,
  },
  // Meta Info
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#cbd5e0",
  },
  // Main Image
  mainImageContainer: {
    marginBottom: 0,
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  proportionalImage: { width: "100%", backgroundColor: "#E2E8F0" },
  featuredHeroImage: { width: "100%", height: 310, backgroundColor: "#0F172A" },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  sharedHeaderAction: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  heroCaption: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 68, paddingBottom: 18, overflow: "hidden" },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroGradientBand: { flex: 1 },
  heroCategory: { alignSelf: "flex-start", color: "#FFFFFF", backgroundColor: "#1E3A8A", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontSize: 9, fontWeight: "800", letterSpacing: 0.7, overflow: "hidden", marginBottom: 9 },
  heroTitle: { color: "#FFFFFF", fontSize: 22, lineHeight: 28, fontWeight: "800", letterSpacing: -0.4 },
  heroMeta: { color: "#E2E8F0", fontSize: 11, fontWeight: "500", marginTop: 9 },
  articleBody: { marginTop: -8, paddingTop: 24, backgroundColor: "#FFFFFF", borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  attachmentSection: { marginBottom: 24 },
  attachmentGallery: { paddingHorizontal: 20, gap: 14 },
  attachmentImageCard: { width: "100%", borderRadius: 8, overflow: "hidden", backgroundColor: "#E2E8F0", borderWidth: 1, borderColor: "#E2E8F0" },
  attachmentNumber: {
    position: "absolute",
    right: 12,
    top: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
  },
  attachmentNumberText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Description
  descriptionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: "#ffffff",
    borderLeftWidth: 4,
    borderLeftColor: "#1E3A8A",
    borderRadius: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#1f2937",
    fontWeight: "500",
  },
  // Content
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#475569",
  },
  // Gallery
  gallerySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  galleryScroll: {
    paddingHorizontal: 20,
  },
  galleryItem: {
    width: 140,
    height: 140,
    marginRight: 12,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Documents
  documentsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },
  documentType: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "500",
  },
  // Image Viewer
  viewer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  viewerSlide: { flex: 1, justifyContent: "center", alignItems: "center" },
  viewerCounter: { position: "absolute", bottom: 42, alignSelf: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  viewerCounterText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});
