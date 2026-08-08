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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import api, { resolveMediaUrl } from "../../src/services/api";
import AppHeader from "../../src/components/AppHeader";

const { width } = Dimensions.get("window");
const FALLBACK_IMAGE = require("../../assets/images/fallback.png");

export default function NewsDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (id) fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      const record = await api.publications.get(id);
      setArticle(record);
    } catch (e) {
      console.log("Failed to load article:", e);
      Alert.alert("Error", "Failed to load article details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0052CC" />
        <Text style={{ marginTop: 12, color: "#64748B" }}>Loading official release...</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <AppHeader title="Press Release" subtitle="ZRP Official Publication" showBack={true} />
        <View style={styles.loading}>
          <Text style={{ color: "#64748B" }}>Article not found.</Text>
        </View>
      </View>
    );
  }

  const coverUrl = resolveMediaUrl(article.cover_image_url);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header */}
      <AppHeader
        title="Official Press Release"
        subtitle="Zimbabwe Republic Police Command"
        showBack={true}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.contentPadding}>
          <Text style={styles.categoryBadge}>{article.category || "Press Release"}</Text>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.dateText}>
            {article.published_at
              ? new Date(article.published_at).toLocaleDateString("en-US", {
                  weekday: "long", year: "numeric", month: "long", day: "numeric"
                })
              : "Official Release"}
          </Text>
        </View>

        {coverUrl && (
          <TouchableOpacity onPress={() => {
            setSelectedImage(coverUrl);
            setImageViewerVisible(true);
          }}>
            <Image source={{ uri: coverUrl }} style={styles.mainImage} defaultSource={FALLBACK_IMAGE} />
          </TouchableOpacity>
        )}

        <View style={styles.contentPadding}>
          {article.summary && (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>{article.summary}</Text>
            </View>
          )}

          {article.content && (
            <Text style={styles.bodyContent}>
              {article.content.replace(/<[^>]*>/g, "")}
            </Text>
          )}

          {article.attachments && article.attachments.length > 0 && (
            <View style={styles.attachmentsSection}>
              <Text style={styles.sectionTitle}>Official Attachments</Text>
              {article.attachments.map((att, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.docRow}
                  onPress={() => Linking.openURL(resolveMediaUrl(att.url))}
                >
                  <MaterialIcons name="insert-drive-file" size={22} color="#0052CC" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.docName} numberOfLines={1}>{att.name}</Text>
                    <Text style={styles.docSize}>{att.size || "PDF Document"}</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#0052CC" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Full Image Viewer */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  contentPadding: { padding: 20 },
  categoryBadge: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "700",
    color: "#0052CC",
    backgroundColor: "#E6EFFC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#1E3A8A", lineHeight: 28, marginBottom: 8 },
  dateText: { fontSize: 12, color: "#64748B", marginBottom: 14 },
  mainImage: { width: width - 40, height: 220, marginHorizontal: 20, borderRadius: 12 },
  summaryBox: {
    backgroundColor: "#F8FAFC",
    borderLeftWidth: 4,
    borderLeftColor: "#0052CC",
    padding: 14,
    marginBottom: 20,
    borderRadius: 4,
  },
  summaryText: { fontSize: 14, fontWeight: "600", color: "#334155", lineHeight: 20 },
  bodyContent: { fontSize: 14.5, color: "#1E293B", lineHeight: 24 },
  attachmentsSection: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 12 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  docName: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  docSize: { fontSize: 11, color: "#64748B" },
  viewer: { flex: 1, backgroundColor: "black", justifyContent: "center" },
  viewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  fullImage: { width: "100%", height: "100%" },
});
