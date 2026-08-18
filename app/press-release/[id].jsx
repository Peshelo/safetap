import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Linking,
  Modal,
  SafeAreaView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import pb from "../../lib/connection";

const { width } = Dimensions.get("window");

export default function NewsDetails() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const router = useRouter(); 

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (id) fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const record = await pb.collection("news").getOne(id);
      setArticle(record);

      const processed = [];

      if (record.file) {
        const url = pb.files.getURL(record, record.file);
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(record.file);

        processed.push({
          type: isImage ? "image" : "document",
          filename: record.file,
          url,
        });
      }

      if (Array.isArray(record.attachments)) {
        record.attachments.forEach((name) => {
          const url = pb.files.getURL(record, name);
          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(name);

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

      const text = `${article.title}\n\n${article.description ?? ""}`;

      const image = attachments.find((a) => a.type === "image");
      if (image) {
        const fileName = image.url.split("/").pop();
        const path = FileSystem.cacheDirectory + fileName;
        const { uri } = await FileSystem.downloadAsync(image.url, path);
        await Sharing.shareAsync(uri);
      } else {
        await Sharing.shareAsync(text);
      }
    } catch (e) {
      Alert.alert("Error", "Unable to share article");
    }
  };

  const images = attachments.filter((a) => a.type === "image");
  const documents = attachments.filter((a) => a.type === "document");

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading article…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={shareArticle} style={styles.headerButton}>
          <Ionicons name="share-social" size={24} color="#1E3A8A" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {/* Category Badge */}
        {article.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{article.category}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>{article.title}</Text>

        {/* Meta Info */}
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>
              {new Date(article.created).toLocaleDateString("en-US", { 
                year: "numeric", 
                month: "short", 
                day: "numeric" 
              })}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>
              {new Date(article.created).toLocaleTimeString("en-US", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </Text>
          </View>
        </View>

        {/* Main Image */}
        {images[0] && (
          <TouchableOpacity 
            onPress={() => {
              setSelectedImage(images[0].url);
              setImageViewerVisible(true);
            }}
            style={styles.mainImageContainer}
          >
            <Image source={{ uri: images[0].url }} style={styles.mainImage} resizeMode="cover" />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand-outline" size={24} color="white" />
            </View>
          </TouchableOpacity>
        )}

        {/* Description */}
        {article.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.description}>
              {article.description.replace(/<[^>]*>/g, "")}
            </Text>
          </View>
        )}

        {/* Content */}
        {article.content && (
          <View style={styles.contentSection}>
            <Text style={styles.contentText}>
              {article.content.replace(/<[^>]*>/g, "")}
            </Text>
          </View>
        )}

        {/* Additional Images Gallery */}
        {images.length > 1 && (
          <View style={styles.gallerySection}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.galleryScroll}
              scrollEventThrottle={16}
            >
              {images.slice(1).map((img, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setSelectedImage(img.url);
                    setImageViewerVisible(true);
                  }}
                  style={styles.galleryItem}
                >
                  <Image source={{ uri: img.url }} style={styles.galleryImage} resizeMode="cover" />
                  <View style={styles.galleryOverlay}>
                    <Ionicons name="expand-outline" size={18} color="white" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

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
                  <MaterialIcons name="insert-drive-file" size={20} color="#1E3A8A" />
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
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
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
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  // Content
  scrollContent: {
    flex: 1,
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
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
    height: 240,
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
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
});
