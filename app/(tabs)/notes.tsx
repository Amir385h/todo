import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import NoteFormModal from '../../components/NoteFormModal';
import { loadItems, saveItems, NoteOrGoal } from '../../utils/notes';

type FilterKey = 'همه' | 'یادداشت' | 'هدف';
const FILTERS: FilterKey[] = ['همه', 'یادداشت', 'هدف'];

function AnimatedAddButton({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.88))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
    >
      <Animated.View style={[styles.addButton, animatedStyle]}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

export default function NotesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<NoteOrGoal[]>([]);
  const [filter, setFilter] = useState<FilterKey>('همه');
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItems().then(setItems);
    }, [])
  );

  const handleSubmit = async (data: Omit<NoteOrGoal, 'id' | 'createdAt'>) => {
    const newItem: NoteOrGoal = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    const updated = [newItem, ...items];
    setItems(updated);
    await saveItems(updated);
    setModalVisible(false);
    router.push(`/note/${newItem.id}` as any);
  };

  const filteredItems = items.filter(it => filter === 'همه' || it.type === filter);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Platform.OS === 'android' ? 40 : 20 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.header}>یادداشت‌ها و اهداف</Text>
          <AnimatedAddButton onPress={() => setModalVisible(true)} />
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="document-text-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyText}>هنوز چیزی اضافه نکردی</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const doneCount = item.checklist.filter(c => c.done).length;
          return (
            <Animated.View
              entering={FadeInDown.delay(index * 40).springify().damping(15)}
              layout={Layout.springify()}
            >
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push(`/note/${item.id}` as any)}
              >
                <View style={[styles.colorBar, { backgroundColor: item.color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.typeBadgeRow}>
                      {item.type === 'هدف' && item.reached === true && (
                        <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                      )}
                      {item.type === 'هدف' && item.reached === false && (
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      )}
                      {item.type === 'هدف' && (
                        <View style={styles.termBadge}>
                          <Text style={styles.termBadgeText}>{item.term}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {item.content ? (
                    <Text style={styles.cardContent} numberOfLines={2}>
                      {item.content}
                    </Text>
                  ) : null}

                  {item.type === 'هدف' && (
                    <View style={styles.progressWrap}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${item.progress || 0}%`, backgroundColor: item.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>{item.progress || 0}٪</Text>
                    </View>
                  )}

                  {item.checklist.length > 0 && (
                    <Text style={styles.checklistSummary}>
                      {doneCount} از {item.checklist.length} چک‌لیست انجام شده
                    </Text>
                  )}

                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      <NoteFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  filterChipActive: { backgroundColor: '#FFFFFF' },
  filterChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  filterChipTextActive: { color: '#7C3AED', fontWeight: '700' },
  emptyWrap: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 12, fontSize: 15 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  colorBar: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', flex: 1 },
  typeBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  termBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  termBadgeText: { fontSize: 11, color: '#475569' },
  cardContent: { color: '#64748B', fontSize: 13, marginTop: 6, textAlign: 'right' },
  progressWrap: { marginTop: 10 },
  progressBarBg: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 11, color: '#64748B', marginTop: 4, textAlign: 'right' },
  checklistSummary: { fontSize: 12, color: '#64748B', marginTop: 8, textAlign: 'right' },
  dateText: { fontSize: 11, color: '#94A3B8', marginTop: 8, textAlign: 'right' },
});