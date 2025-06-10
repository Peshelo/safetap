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
import { useLocalSearchParams, Stack } from "expo-router";
import pb from "../../lib/connection";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

const { width, height } = Dimensions.get("window");

const NewsDetails = () => {
  const { id } = useLocalSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const fetchArticle = async () => {
    try {
      const record = await pb.collection("news").getOne(id);
      setArticle(record);

      // Process attachments (assuming files are stored in a field called 'attachments' or similar)
      const processedAttachments = [];

      // Check for image field

      // Check for document/PDF field (adjust field name as needed)
      if (record.file) {
        const docUrl = pb.files.getURL(record, record.file);
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(record.file);
        const isPdf = /\.pdf$/i.test(record.file);

        processedAttachments.push({
          type: isPdf ? "pdf" : isImage ? "image" : "file",
          filename: record.file,
          url: docUrl,
          field: "file",
        });
      }

      // Check for attachments field (if you have multiple files)
      if (record.attachments && Array.isArray(record.attachments)) {
        record.attachments.forEach((filename) => {
          const fileUrl = pb.files.getURL(record, filename);
          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename);
          const isPdf = /\.pdf$/i.test(filename);

          processedAttachments.push({
            type: isPdf ? "pdf" : isImage ? "image" : "document",
            filename: filename,
            url: fileUrl,
            field: "attachments",
          });
        });
      }

      setAttachments(processedAttachments);
    } catch (err) {
      console.error(err);
      setError("Failed to load article");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const openImageViewer = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageViewerVisible(true);
  };

  const openPdfViewer = () => {
    setPdfViewerVisible(true);
  };

  const openExternalPdf = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Error",
          "Cannot open PDF. Please install a PDF viewer app."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open PDF");
    }
  };

  const downloadFile = async (url, filename) => {
    Alert.alert("Download File", `Do you want to open ${filename}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open",
        onPress: () => openExternalPdf(url),
      },
    ]);
  };

  const renderAttachment = (attachment, index) => {
    switch (attachment.type) {
      case "image":
        return (
          <TouchableOpacity
            key={index}
            onPress={() => openImageViewer(attachment.url)}
            style={styles.imageContainer}
          >
            <Image
              source={{ uri: attachment.url }}
              style={styles.articleImage}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <Ionicons name="expand-outline" size={24} color="white" />
            </View>
          </TouchableOpacity>
        );

      case "pdf":
        return (
          <View key={index} style={styles.attachmentCard}>
            <View style={styles.attachmentInfo}>
              <View style={styles.pdfIconContainer}>
                <Ionicons name="document-text" size={32} color="#dc2626" />
              </View>
              <View style={styles.attachmentDetails}>
                <Text style={styles.attachmentName}>{attachment.filename}</Text>
                <Text style={styles.attachmentType}>PDF Document</Text>
              </View>
            </View>
            <View style={styles.attachmentActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setPdfViewerVisible(true)}
              >
                <Ionicons name="eye-outline" size={18} color="#3b82f6" />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  downloadFile(attachment.url, attachment.filename)
                }
              >
                <Ionicons name="download-outline" size={18} color="#3b82f6" />
                <Text style={styles.actionButtonText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return (
          <TouchableOpacity
            key={index}
            style={styles.attachmentCard}
            onPress={() => downloadFile(attachment.url, attachment.filename)}
          >
            <View style={styles.attachmentInfo}>
              <View style={styles.fileIconContainer}>
                <Ionicons name="document-outline" size={32} color="#6b7280" />
              </View>
              <View style={styles.attachmentDetails}>
                <Text style={styles.attachmentName}>{attachment.filename}</Text>
                <Text style={styles.attachmentType}>Document</Text>
              </View>
            </View>
            <Ionicons name="download-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        );
    }
  };

  const renderImageViewer = () => (
    <Modal
      visible={imageViewerVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setImageViewerVisible(false)}
    >
      <SafeAreaView style={styles.imageViewerContainer}>
        <TouchableOpacity
          style={styles.imageViewerClose}
          onPress={() => setImageViewerVisible(false)}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.imageViewerContent}
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderPdfViewer = () => {
    const pdfAttachment = attachments.find((att) => att.type === "pdf");

    if (!pdfAttachment) return null;

    return (
      <Modal
        visible={pdfViewerVisible}
        animationType="slide"
        onRequestClose={() => setPdfViewerVisible(false)}
      >
        <SafeAreaView style={styles.pdfViewerContainer}>
          <View style={styles.pdfHeader}>
            <TouchableOpacity
              onPress={() => setPdfViewerVisible(false)}
              style={styles.pdfBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.pdfTitle}>{pdfAttachment.filename}</Text>
            <TouchableOpacity
              onPress={() => openExternalPdf(pdfAttachment.url)}
              style={styles.pdfOpenButton}
            >
              <Ionicons name="open-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          <WebView
            source={{ uri: pdfAttachment.url }}
            style={styles.webView}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.webViewLoading}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading PDF...</Text>
              </View>
            )}
            onError={() => {
              Alert.alert(
                "PDF Viewer Error",
                "Cannot display PDF in app. Would you like to open it externally?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Open Externally",
                    onPress: () => openExternalPdf(pdfAttachment.url),
                  },
                ]
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  const images = attachments.filter((att) => att.type === "image");
  const documents = attachments.filter(
    (att) => att.type === "pdf" || att.type === "document"
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading article...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchArticle}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <Stack.Screen
          options={{
            title: article?.title || "Article",
            headerTitleStyle: { fontSize: 16 },
          }}
        />

        {/* Header Image */}
        {images.length > 0 && (
          <TouchableOpacity
            onPress={() => openImageViewer(images[0].url)}
            style={styles.headerImageContainer}
          >
            <Image
              source={{ uri: images[0].url }}
              style={styles.headerImage}
              resizeMode="cover"
            />
            <View style={styles.headerImageOverlay}>
              <Ionicons name="expand-outline" size={24} color="white" />
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.contentContainer}>
          {/* Article Header */}
          <Text style={styles.articleTitle}>{article.title}</Text>

          <View style={styles.metaContainer}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
            <Text style={styles.dateText}>
              {new Date(article.created).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>

          {/* Article Content */}
          <View style={styles.contentSection}>
            {/* <Text style={styles.articleContent}>
              {article.description?.replace(/<[^>]*>/g, "") ||
                "No content available."}
            </Text> */}

            {article.content && (
              <Text style={styles.articleBody}>
                {article.content.replace(/<[^>]*>/g, "")}
              </Text>
            )}
          </View>

          {/* Additional Images */}
          {images.length > 1 && (
            <View style={styles.gallerySection}>
              <Text style={styles.sectionTitle}>Images</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.galleryContainer}>
                  {images.slice(1).map((attachment, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => openImageViewer(attachment.url)}
                      style={styles.galleryItem}
                    >
                      <Image
                        source={{ uri: attachment.url }}
                        style={styles.galleryImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Documents Section */}
          {documents.length > 0 && (
            <View style={styles.documentsSection}>
              <Text style={styles.sectionTitle}>Attachments</Text>
              {documents.map((attachment, index) =>
                renderAttachment(attachment, index)
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {renderImageViewer()}
      {renderPdfViewer()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "500",
  },
  headerImageContainer: {
    position: "relative",
  },
  headerImage: {
    width: width,
    height: 250,
  },
  headerImageOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  contentContainer: {
    padding: 20,
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    lineHeight: 32,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
  },
  contentSection: {
    marginBottom: 24,
  },
  articleContent: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 16,
  },
  articleBody: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  gallerySection: {
    marginBottom: 24,
  },
  galleryContainer: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 20,
  },
  galleryItem: {
    borderRadius: 8,
    overflow: "hidden",
  },
  galleryImage: {
    width: 120,
    height: 120,
  },
  documentsSection: {
    marginBottom: 24,
  },
  attachmentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  attachmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pdfIconContainer: {
    marginRight: 12,
  },
  fileIconContainer: {
    marginRight: 12,
  },
  attachmentDetails: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  attachmentType: {
    fontSize: 12,
    color: "#6b7280",
  },
  attachmentActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
  },
  imageContainer: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  articleImage: {
    width: "100%",
    height: 200,
  },
  imageOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    padding: 6,
  },
  // Modal Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  imageViewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: width,
    height: height * 0.8,
  },
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  pdfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
  },
  pdfBackButton: {
    padding: 8,
  },
  pdfTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
    marginHorizontal: 16,
  },
  pdfOpenButton: {
    padding: 8,
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
    gap: 12,
  },
});

export default NewsDetails;
