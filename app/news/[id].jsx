import { View, Text, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import pb from '../../lib/connection';
import { Ionicons } from '@expo/vector-icons';

const NewsDetails = () => {
  const { id } = useLocalSearchParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArticle = async () => {
    try {
      const record = await pb.collection('news').getOne(id);
      setArticle(record);
    } catch (err) {
      console.error(err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticle();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center px-4">
        <Text className="text-red-500 text-center">{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      <Stack.Screen options={{ title: article?.title || 'Article' }} />

      {article?.image && (
        <Image
          source={{ uri: pb.files.getURL(article, article.image) }}
          className="w-full h-64"
          resizeMode="cover"
        />
      )}

      <View className="p-5">
        <Text className="text-2xl font-bold text-gray-900 mb-2">{article.title}</Text>
        <View className="flex-row items-center mb-4">
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text className="text-gray-500 text-sm ml-1">
            {new Date(article.created).toLocaleDateString()}
          </Text>
        </View>

        <Text className="text-gray-800 text-base leading-6">
          {article.description?.replace(/<[^>]*>/g, '') || 'No content available.'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default NewsDetails;
