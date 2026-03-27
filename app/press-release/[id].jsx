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
      <View style={styles.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" />
        <Text>Loading article…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={shareArticle} style={styles.iconBtn}>
          <Ionicons name="share-outline" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{article.title}</Text>

        {images[0] && (
          <TouchableOpacity onPress={() => {
            setSelectedImage(images[0].url);
            setImageViewerVisible(true);
          }}>
            <Image source={{ uri: images[0].url }} style={styles.mainImage} />
          </TouchableOpacity>
        )}

        {article.description && (
          <Text style={styles.description}>
            {article.description.replace(/<[^>]*>/g, "")}
          </Text>
        )}

        {article.content && (
          <Text style={styles.content}>
            {article.content.replace(/<[^>]*>/g, "")}
          </Text>
        )}

        {images.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>More Images</Text>
            <ScrollView horizontal>
              {images.slice(1).map((img, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    setSelectedImage(img.url);
                    setImageViewerVisible(true);
                  }}
                >
                  <Image source={{ uri: img.url }} style={styles.thumb} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {documents.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Documents</Text>
            {documents.map((doc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.doc}
                onPress={() => Linking.openURL(doc.url)}
              >
                <MaterialIcons name="insert-drive-file" size={24} />
                <Text style={styles.docText} numberOfLines={1}>
                  {doc.filename}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Image Viewer */}
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
  container: { flex: 1, backgroundColor: "#fff" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  mainImage: {
    width: width - 40,
    height: 240,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  description: {
    padding: 20,
    fontSize: 16,
    lineHeight: 24,
  },
  content: {
    paddingHorizontal: 20,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  thumb: {
    width: 120,
    height: 120,
    marginLeft: 20,
    borderRadius: 8,
  },
  doc: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  docText: {
    marginLeft: 12,
    flex: 1,
  },
  viewer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
});
