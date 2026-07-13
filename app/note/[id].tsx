import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { loadItems, saveItems, NoteOrGoal, NoteColor, GoalTerm } from '../../utils/notes';

const COLORS: NoteColor[] = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#8B5CF6', '#64748B'];

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [allItems, setAllItems] = useState<NoteOrGoal[]>([]);
  const [item, setItem] = useState<NoteOrGoal | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('#3B82F6');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadItems().then(items => {
      setAllItems(items);
      const found = items.find(it => it.id === id) || null;
      if (found) {
        setItem(found);
        setTitle(found.title);
        setContent(found.content);
        setColor(found.color);
      }
      setLoaded(true);
    });
  }, [id]);

  useEffect(() => {
    if (loaded && item) {
      const updated = allItems.map(it => (it.id === item.id ? item : it));
      saveItems(updated);
    }
  }, [item]);

  if (!loaded || !item) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ padding: 20, color: '#64748B' }}>در حال بارگذاری...</Text>
      </SafeAreaView>
    );
  }

  const updateField = (patch: Partial<NoteOrGoal>) => {
    setItem(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const handleDelete = async () => {
    const updated = allItems.filter(it => it.id !== item.id);
    await saveItems(updated);
    router.back();
  };

  const addChecklistItem = () => {
    if (newChecklistText.trim().length === 0) return;
    updateField({
      checklist: [
        ...item.checklist,
        { id: Date.now().toString(), text: newChecklistText.trim(), done: false },
      ],
    });
    setNewChecklistText('');
  };

  const toggleChecklistItem = (checklistId: string) => {
    updateField({
      checklist: item.checklist.map(c =>
        c.id === checklistId ? { ...c, done: !c.done } : c
      ),
    });
  };

  const removeChecklistItem = (checklistId: string) => {
    updateField({ checklist: item.checklist.filter(c => c.id !== checklistId) });
  };

  const formatDate = (isoOrDate: string | Date) => {
    return new Date(isoOrDate).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleDelete} style={{ marginLeft: 16 }}>
            <Ionicons name="trash-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.colorStrip, { backgroundColor: color }]} />

        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={text => {
            setTitle(text);
            updateField({ title: text });
          }}
          placeholder="عنوان..."
          placeholderTextColor="#94A3B8"
        />

        <TextInput
          style={styles.contentInput}
          value={content}
          onChangeText={text => {
            setContent(text);
            updateField({ content: text });
          }}
          placeholder="متن..."
          placeholderTextColor="#94A3B8"
          multiline
        />

        {item.type === 'هدف' && (
          <View style={styles.goalSection}>
            <Text style={styles.sectionLabel}>نوع هدف</Text>
            <View style={styles.chipRow}>
              {(['کوتاه‌مدت', 'بلندمدت'] as GoalTerm[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, item.term === t && styles.chipActive]}
                  onPress={() => updateField({ term: t })}
                >
                  <Text style={[styles.chipText, item.term === t && styles.chipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>تاریخ هدف</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>
                {item.targetDate ? formatDate(item.targetDate) : 'انتخاب تاریخ'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={item.targetDate ? new Date(item.targetDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) updateField({ targetDate: selectedDate.toISOString() });
                }}
              />
            )}

            <Text style={styles.sectionLabel}>درصد پیشرفت: {item.progress || 0}٪</Text>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={item.progress || 0}
              minimumTrackTintColor={color}
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor={color}
              onSlidingComplete={value => updateField({ progress: Math.round(value) })}
            />

            <Text style={styles.sectionLabel}>وضعیت هدف</Text>
            <View style={styles.reachedRow}>
              <TouchableOpacity
                style={[
                  styles.reachedButton,
                  item.reached === true && styles.reachedButtonActiveGreen,
                ]}
                onPress={() => updateField({ reached: true, progress: 100 })}
              >
                <Text
                  style={[
                    styles.reachedButtonText,
                    item.reached === true && styles.reachedButtonTextActive,
                  ]}
                >
                  بهش رسیدم
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reachedButton,
                  item.reached === false && styles.reachedButtonActiveRed,
                ]}
                onPress={() => updateField({ reached: false })}
              >
                <Text
                  style={[
                    styles.reachedButtonText,
                    item.reached === false && styles.reachedButtonTextActive,
                  ]}
                >
                  بهش نرسیدم
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>چک‌لیست</Text>
        {item.checklist.map(c => (
          <View key={c.id} style={styles.checklistRow}>
            <TouchableOpacity onPress={() => removeChecklistItem(c.id)}>
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
            <Text style={[styles.checklistText, c.done && styles.checklistTextDone]}>
              {c.text}
            </Text>
            <TouchableOpacity
              style={[styles.checkbox, c.done && { backgroundColor: color, borderColor: color }]}
              onPress={() => toggleChecklistItem(c.id)}
            >
              {c.done && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.addChecklistRow}>
          <TextInput
            style={[styles.checklistInput, { flex: 1 }]}
            placeholder="آیتم جدید..."
            placeholderTextColor="#94A3B8"
            value={newChecklistText}
            onChangeText={setNewChecklistText}
            onSubmitEditing={addChecklistItem}
          />
          <TouchableOpacity style={styles.addChecklistButton} onPress={addChecklistItem}>
            <Text style={styles.addChecklistButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>رنگ</Text>
        <View style={styles.colorRow}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                color === c && styles.colorCircleActive,
              ]}
              onPress={() => {
                setColor(c);
                updateField({ color: c });
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 10,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  colorStrip: { height: 5, borderRadius: 3, marginBottom: 16 },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 12,
  },
  contentInput: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'right',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  goalSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 10,
    marginTop: 14,
    textAlign: 'right',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { color: '#64748B', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  dateButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButtonText: { color: '#0F172A', fontSize: 14, textAlign: 'center' },
  reachedRow: { flexDirection: 'row', gap: 10 },
  reachedButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  reachedButtonActiveGreen: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  reachedButtonActiveRed: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  reachedButtonText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  reachedButtonTextActive: { color: '#FFFFFF' },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  checklistText: { color: '#0F172A', fontSize: 14, flex: 1, textAlign: 'right' },
  checklistTextDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  addChecklistRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  checklistInput: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addChecklistButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addChecklistButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  colorCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorCircleActive: { borderColor: '#0F172A' },
});