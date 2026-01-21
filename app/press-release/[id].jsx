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
import CustomHeader from "../components/Header";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

const NewsDetails = () => {
  const navigation = useNavigation();
  const { id } = useLocalSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [pdfViewerVisible, setPdfViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [attachments, setAttachments] = useState([]);

  const truncateTitle = (title, maxLength = 30) => {
    if (!title) return "Article";
    return title.length > maxLength
      ? title.substring(0, maxLength) + "..."
      : title;
  };

  const fetchArticle = async () => {
    try {
      const record = await pb.collection("news").getOne(id);
      setArticle(record);

      // Process attachments
      const processedAttachments = [];

      // Check for file field
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
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <CustomHeader
        title={truncateTitle(article?.title)}
        subtitle="Press Release Details"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        showLogo={false}
      />

      <ScrollView style={styles.scrollContent}>
        {/* Article Header */}
        <View style={styles.articleHeader}>
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
        </View>

        {/* File Preview Section - Similar to News preview */}
        {attachments.length > 0 && (
          <View style={styles.filePreviewSection}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            {images.map((img, index) => (
              <TouchableOpacity
                key={`image-${index}`}
                onPress={() => openImageViewer(img.url)}
                style={styles.imagePreviewContainer}
              >
                <Image
                  source={{ uri: img.url }}
                  style={styles.fullPreviewImage}
                  resizeMode="contain"
                />
                <View style={styles.imageExpandIcon}>
                  <Ionicons name="expand-outline" size={20} color="white" />
                </View>
              </TouchableOpacity>
            ))}

            {documents.map((doc, index) => (
              <View key={`doc-${index}`} style={styles.pdfPreviewContainer}>
                <Ionicons name="document" size={48} color="#3b82f6" />
                <Text style={styles.pdfPreviewText}>{doc.filename}</Text>
                <Text style={styles.pdfPreviewSubtext}>PDF Document</Text>
                <View style={styles.pdfActions}>
                  <TouchableOpacity
                    style={styles.viewPdfButton}
                    onPress={() => setPdfViewerVisible(true)}
                  >
                    <Ionicons name="eye-outline" size={18} color="white" />
                    <Text style={styles.viewPdfButtonText}>View PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.downloadPdfButton}
                    onPress={() => openExternalPdf(doc.url)}
                  >
                    <Ionicons
                      name="download-outline"
                      size={18}
                      color="#3b82f6"
                    />
                    <Text style={styles.downloadPdfButtonText}>Download</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Description Section */}
        {article.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {article.description.replace(/<[^>]*>/g, "")}
            </Text>
          </View>
        )}

        {/* Content Section */}
        {article.content && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Full Content</Text>
            <Text style={styles.contentText}>
              {article.content.replace(/<[^>]*>/g, "")}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerText}>
            Published on{" "}
            {new Date(article.created).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
      </ScrollView>

      {renderImageViewer()}
      {renderPdfViewer()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
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
    backgroundColor: "#f8fafc",
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
  articleHeader: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  articleTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 32,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
  },
  filePreviewSection: {
    backgroundColor: "#fff",
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  fullPreviewImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
  },
  imageExpandIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 8,
  },
  pdfPreviewContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },
  pdfPreviewText: {
    fontSize: 16,
    color: "#374151",
    marginTop: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  pdfPreviewSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  pdfActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  viewPdfButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  viewPdfButtonText: {
    color: "white",
    fontWeight: "500",
    fontSize: 14,
  },
  downloadPdfButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  downloadPdfButtonText: {
    color: "#3b82f6",
    fontWeight: "500",
    fontSize: 14,
  },
  descriptionSection: {
    backgroundColor: "#fff",
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  descriptionText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  contentSection: {
    backgroundColor: "#fff",
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  contentText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    marginTop: 8,
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginBottom: 16,
  },
  footerText: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
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
