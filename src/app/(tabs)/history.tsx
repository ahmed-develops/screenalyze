import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Trash2, Layers } from 'lucide-react-native';
import { StorageService } from '../../services/storageService';
import { ScreenshotAnalysis } from '../../types';
import { AnalysisCard } from '../../components/AnalysisCard';
import { ActionPickerModal } from '../../components/ActionPickerModal';
import { StitchTheme } from '../../theme/stitchTheme';
import { useTheme } from '../../theme/ThemeContext';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'system-design', label: 'System Design' },
  { id: 'youtube-tutorial', label: 'YouTube Tutorials' },
  { id: 'code', label: 'Code & Algo' },
];

export default function HistoryScreen() {
  const { colors, isDark } = useTheme();
  const [items, setItems] = useState<ScreenshotAnalysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [actionItem, setActionItem] = useState<ScreenshotAnalysis | null>(null);

  const loadData = async () => {
    const list = await StorageService.getScreenshots();
    setItems(list);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleClearAll = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all analyzed screenshot summaries and tutorials?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearAll();
            setItems([]);
          },
        },
      ]
    );
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.keyPoints.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={[styles.root, { backgroundColor: 'transparent' }]}>
      {/* Alpine Mountain Scenic Wallpaper matching Home */}
      <Image
        source={{ uri: StitchTheme.backdropUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
        pointerEvents="none"
      />

      {/* Dark Scrim Gradient Overlay matching Home */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.40)',
          'rgba(0, 0, 0, 0.55)',
          'rgba(0, 0, 0, 0.82)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Library</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your screenshots, analyzed.
              </Text>
            </View>
            {items.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll} activeOpacity={0.7}>
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? 'rgba(29, 32, 38, 0.70)' : colors.surfaceSubtle,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : colors.border,
              },
            ]}
          >
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search tutorials, system design topics..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContent}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : isDark
                          ? 'rgba(29, 32, 38, 0.70)'
                          : colors.card,
                      borderColor: isSelected
                        ? colors.primaryLight
                        : isDark
                          ? 'rgba(255, 255, 255, 0.10)'
                          : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textSecondary,
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* List of items */}
          <ScrollView
            style={styles.listArea}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredItems.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: isDark ? 'rgba(25, 28, 34, 0.65)' : colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                  },
                ]}
              >
                <Layers size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No matching screenshots
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery
                    ? 'Try searching with different terms or select "All"'
                    : 'Capture a screenshot on your device to trigger automated AI analysis'}
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <AnalysisCard
                  key={item.id}
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/screenshot/[id]',
                      params: { id: item.id },
                    })
                  }
                  onOpenActions={() => setActionItem(item)}
                  onSelectQuestion={(q) =>
                    router.push({
                      pathname: '/screenshot/[id]',
                      params: { id: item.id, autoPrompt: q },
                    })
                  }
                />
              ))
            )}
          </ScrollView>
        </View>

        {/* Action Picker Modal */}
        {actionItem && (
          <ActionPickerModal
            visible={Boolean(actionItem)}
            screenshot={actionItem}
            onClose={() => setActionItem(null)}
            onActionComplete={(updated) => {
              setActionItem(null);
              router.push({
                pathname: '/screenshot/[id]',
                params: { id: updated.id },
              });
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  categoryScroll: {
    maxHeight: 38,
    marginBottom: 16,
  },
  categoryContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  listArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 110,
  },
  emptyState: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
