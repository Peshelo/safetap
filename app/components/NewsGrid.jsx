import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import NewsCard from "./NewsCard";

const NewsGrid = ({
  data,
  onPress,
  columns = 1,
  compact = false,
  showDescription = false,
  showTag = true,
  showFooter = true,
  itemStyle = {},
}) => {
  const renderItem = ({ item }) => (
    <View style={[styles.itemContainer, { width: `${100 / columns}%` }]}>
      <NewsCard
        item={item}
        onPress={onPress}
        compact={compact}
        showDescription={showDescription}
        showTag={showTag}
        showFooter={showFooter}
        cardStyle={itemStyle}
      />
    </View>
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={columns}
      key={columns}
      scrollEnabled={false}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
  },
  itemContainer: {
    paddingHorizontal: 8,
  },
});

export default NewsGrid;
