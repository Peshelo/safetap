import {
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import pb from '../../lib/connection';
import { Ionicons } from '@expo/vector-icons';

const News = () => {
  const [news, setNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('news').getFullList({ sort: '-created' });
      setNews(records);
      setFilteredNews(records);
    } catch (err) {
      console.error('Failed to fetch news', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    const filtered = news.filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        item.description?.toLowerCase().includes(lower)
    );
    setFilteredNews(filtered);
  }, [search]);

  const renderCard = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/news/${item.id}`)}
      className="mb-5"
    >
      <View style={styles.card}>
        {item.image && (
          <Image
            source={{ uri: pb.files.getURL(item, item.image) }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        <View className="p-3">
          <Text className="text-lg font-bold text-gray-900 mb-1">{item.title}</Text>
          <Text className="text-gray-600 text-sm mb-2">
            {item.description?.replace(/<[^>]*>/g, '').substring(0, 60)}...
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#9ca3af" />
            <Text className="text-gray-400 text-xs ml-1">
              {new Date(item.created).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-white px-4 pt-4">
      <Stack.Screen options={{ title: 'All News' }} />

      <TextInput
        placeholder="Search news..."
        className="border border-gray-300 rounded-lg px-4 py-2 mb-4 text-sm"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={filteredNews}
          keyExtractor={item => item.id}
          renderItem={renderCard}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View className="items-center mt-10">
              <Ionicons name="newspaper-outline" size={32} color="#9ca3af" />
              <Text className="text-gray-400 mt-2">No news articles found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 180,
  },
});

export default News;
