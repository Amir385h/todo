import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AddTaskModal, {
  NewTaskData,
  Priority,
  Category,
} from '../../components/AddTaskModal';
import {
  setupNotificationChannel,
  requestNotificationPermission,
  scheduleTaskNotification,
  cancelTaskNotification,
} from '../../utils/notifications';

type Task = NewTaskData & {
  id: string;
  done: boolean;
  notificationId: string | null;
};

const STORAGE_KEY = 'TODO_TASKS';

const PRIORITY_COLORS: Record<Priority, string> = {
  'کم': '#22C55E',
  'متوسط': '#EAB308',
  'زیاد': '#F97316',
  'خیلی زیاد': '#EF4444',
};

const CATEGORY_ICONS: Record<Category, keyof typeof Ionicons.glyphMap> = {
  'درس': 'book-outline',
  'کار': 'briefcase-outline',
  'شخصی': 'person-outline',
  'سلامتی': 'heart-outline',
  'ورزش': 'barbell-outline',
  'مالی': 'cash-outline',
  'خرید': 'cart-outline',
  'سایر': 'ellipsis-horizontal-outline',
};

const CATEGORY_FILTERS: (Category | 'همه')[] = [
  'همه',
  'درس',
  'کار',
  'شخصی',
  'سلامتی',
  'ورزش',
  'مالی',
  'خرید',
  'سایر',
];

function AnimatedCheckbox({
  done,
  color,
  onPress,
}: {
  done: boolean;
  color: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.8))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
    >
      <Animated.View
        style={[
          styles.checkbox,
          { borderColor: color },
          done && { backgroundColor: color },
          animatedStyle,
        ]}
      >
        {done && <Text style={styles.checkmark}>✓</Text>}
      </Animated.View>
    </Pressable>
  );
}

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

export default function TodoScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState<Category | 'همه'>('همه');
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});

  useEffect(() => {
    setupNotificationChannel();
    requestNotificationPermission();
    loadTasks();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveTasks(tasks);
    }
  }, [tasks, loaded]);

  const loadTasks = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const withDates: Task[] = parsed.map((t: any) => ({
          ...t,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          notificationId: t.notificationId ?? null,
        }));
        setTasks(withDates);
      }
    } catch (e) {
      console.log('خطا در بارگذاری:', e);
    } finally {
      setLoaded(true);
    }
  };

  const saveTasks = async (data: Task[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.log('خطا در ذخیره‌سازی:', e);
    }
  };

  const addTask = async (data: NewTaskData) => {
    let notificationId: string | null = null;
    if (data.dueDate) {
      notificationId = await scheduleTaskNotification(
        Date.now().toString(),
        data.title,
        data.dueDate
      );
    }

    const newTask: Task = {
      id: Date.now().toString(),
      done: false,
      notificationId,
      ...data,
    };
    setTasks([newTask, ...tasks]);
  };

  const updateTask = async (data: NewTaskData) => {
    if (!editingTask) return;

    if (editingTask.notificationId) {
      await cancelTaskNotification(editingTask.notificationId);
    }

    let notificationId: string | null = null;
    if (data.dueDate) {
      notificationId = await scheduleTaskNotification(
        editingTask.id,
        data.title,
        data.dueDate
      );
    }

    setTasks(
      tasks.map(t =>
        t.id === editingTask.id ? { ...t, ...data, notificationId } : t
      )
    );
    setEditingTask(null);
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
    swipeRefs.current[id]?.close();
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.notificationId) {
      cancelTaskNotification(task.notificationId);
    }
    setTasks(tasks.filter(t => t.id !== id));
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingTask(null);
    setModalVisible(true);
  };

  const handleSubmit = (data: NewTaskData) => {
    if (editingTask) {
      updateTask(data);
    } else {
      addTask(data);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fa-IR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const d = new Date(date);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const total = tasks.length;
  const completed = tasks.filter(t => t.done).length;
  const remaining = total - completed;
  const todayCount = tasks.filter(t => isToday(t.dueDate)).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      searchText.trim() === '' ||
      t.title.includes(searchText.trim()) ||
      t.description.includes(searchText.trim());
    const matchesFilter = activeFilter === 'همه' || t.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.headerGradient,
          { paddingTop: Platform.OS === 'android' ? 40 : 20 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.header}>کارهای من</Text>
          <AnimatedAddButton onPress={openAddModal} />
        </View>

        <View style={styles.dashboard}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{todayCount}</Text>
              <Text style={styles.statLabel}>امروز</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{total}</Text>
              <Text style={styles.statLabel}>کل کارها</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#4ADE80' }]}>
                {completed}
              </Text>
              <Text style={styles.statLabel}>انجام شده</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#FDBA74' }]}>
                {remaining}
              </Text>
              <Text style={styles.statLabel}>باقی‌مانده</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}٪ پیشرفت</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.bodyContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="جستجو در کارها..."
          placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
        />

        <View style={styles.filterWrap}>
          {CATEGORY_FILTERS.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                activeFilter === cat && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === cat && styles.filterChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredTasks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20, paddingTop: 12 }}
          renderItem={({ item }) => (
            <Animated.View
              entering={FadeInDown.springify().damping(15)}
              exiting={FadeOutUp.duration(200)}
              layout={Layout.springify()}
            >
              <Swipeable
                ref={ref => {
                  swipeRefs.current[item.id] = ref;
                }}
                renderLeftActions={() => (
                  <View style={styles.leftAction}>
                    <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                    <Text style={styles.actionText}>انجام شد</Text>
                  </View>
                )}
                renderRightActions={() => (
                  <View style={styles.rightAction}>
                    <Text style={styles.actionText}>حذف</Text>
                    <Ionicons name="trash" size={20} color="#FFFFFF" />
                  </View>
                )}
                onSwipeableOpen={direction => {
                  if (direction === 'left') toggleTask(item.id);
                  if (direction === 'right') deleteTask(item.id);
                }}
              >
                <View style={styles.taskCardWrap}>
                  <View
                    style={[
                      styles.priorityBar,
                      { backgroundColor: PRIORITY_COLORS[item.priority] },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.taskCard}
                    activeOpacity={0.85}
                    onPress={() => openEditModal(item)}
                  >
                    <View style={styles.taskTop}>
                      <View style={styles.taskTextWrap}>
                        <AnimatedCheckbox
                          done={item.done}
                          color="#3B82F6"
                          onPress={() => toggleTask(item.id)}
                        />
                        <View style={styles.categoryIconWrap}>
                          <Ionicons
                            name={CATEGORY_ICONS[item.category]}
                            size={16}
                            color="#3B82F6"
                          />
                        </View>
                        <Text
                          style={[
                            styles.taskText,
                            item.done && styles.taskTextDone,
                          ]}
                        >
                          {item.title}
                        </Text>
                      </View>
                      <View style={styles.dateTimeWrap}>
                        {formatDate(item.dueDate) && (
                          <Text style={styles.dateText}>{formatDate(item.dueDate)}</Text>
                        )}
                        {formatTime(item.dueDate) && (
                          <Text style={styles.timeText}>{formatTime(item.dueDate)}</Text>
                        )}
                      </View>
                    </View>

                    {item.description ? (
                      <Text style={styles.description}>{item.description}</Text>
                    ) : null}

                    <View style={styles.tagsRow}>
                      <View
                        style={[
                          styles.priorityTag,
                          { backgroundColor: PRIORITY_COLORS[item.priority] },
                        ]}
                      >
                        <Text style={styles.tagText}>{item.priority}</Text>
                      </View>
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{item.category}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </Swipeable>
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {tasks.length === 0
                  ? 'هنوز کاری اضافه نکردی'
                  : 'کاری با این مشخصات پیدا نشد'}
              </Text>
            </View>
          }
        />
      </View>

      <AddTaskModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditingTask(null);
        }}
        onSubmit={handleSubmit}
        initialData={editingTask}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboard: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 18,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 4,
  },
  progressWrap: {
    marginTop: 14,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    color: '#64748B',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  taskCardWrap: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  priorityBar: {
    width: 5,
  },
  taskCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryIconWrap: {
    backgroundColor: '#EFF6FF',
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  taskText: {
    color: '#0F172A',
    fontSize: 16,
    flexShrink: 1,
    fontWeight: '500',
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  dateTimeWrap: {
    alignItems: 'flex-end',
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  timeText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  description: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 8,
    marginRight: 42,
    textAlign: 'right',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginRight: 42,
  },
  priorityTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTagText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 15,
  },
  leftAction: {
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingLeft: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  rightAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingRight: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});