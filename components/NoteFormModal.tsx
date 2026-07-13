import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NoteColor, GoalTerm, NoteOrGoal } from '../utils/notes';

const COLORS: NoteColor[] = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#8B5CF6', '#64748B'];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<NoteOrGoal, 'id' | 'createdAt'>) => void;
};

export default function NoteFormModal({ visible, onClose, onSubmit }: Props) {
  const [itemType, setItemType] = useState<'یادداشت' | 'هدف'>('یادداشت');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('#3B82F6');
  const [term, setTerm] = useState<GoalTerm>('کوتاه‌مدت');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setItemType('یادداشت');
      setTitle('');
      setContent('');
      setColor('#3B82F6');
      setTerm('کوتاه‌مدت');
      setTargetDate(null);
    }
  }, [visible]);

  const handleSubmit = () => {
    if (title.trim().length === 0) return;
    onSubmit({
      type: itemType,
      title: title.trim(),
      content: content.trim(),
      color,
      checklist: [],
      ...(itemType === 'هدف'
        ? {
            term,
            progress: 0,
            targetDate: targetDate ? targetDate.toISOString() : null,
            reached: null,
          }
        : {}),
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.header}>مورد جدید</Text>

            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeButton, itemType === 'یادداشت' && styles.typeButtonActive]}
                onPress={() => setItemType('یادداشت')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    itemType === 'یادداشت' && styles.typeButtonTextActive,
                  ]}
                >
                  یادداشت
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, itemType === 'هدف' && styles.typeButtonActive]}
                onPress={() => setItemType('هدف')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    itemType === 'هدف' && styles.typeButtonTextActive,
                  ]}
                >
                  هدف
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>عنوان</Text>
            <TextInput
              style={styles.input}
              placeholder={itemType === 'هدف' ? 'مثلاً یادگیری زبان' : 'عنوان یادداشت...'}
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>
              {itemType === 'هدف' ? 'توضیحات هدف' : 'متن یادداشت'}
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="بنویس..."
              placeholderTextColor="#94A3B8"
              value={content}
              onChangeText={setContent}
              multiline
            />

            {itemType === 'هدف' && (
              <>
                <Text style={styles.label}>نوع هدف</Text>
                <View style={styles.chipRow}>
                  {(['کوتاه‌مدت', 'بلندمدت'] as GoalTerm[]).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, term === t && styles.chipActive]}
                      onPress={() => setTerm(t)}
                    >
                      <Text style={[styles.chipText, term === t && styles.chipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>تاریخ هدف (اختیاری)</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateButtonText}>
                    {targetDate ? formatDate(targetDate) : 'انتخاب تاریخ'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={targetDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setTargetDate(selectedDate);
                    }}
                  />
                )}
              </>
            )}

            <Text style={styles.label}>رنگ</Text>
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    color === c && styles.colorCircleActive,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>انصراف</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>افزودن</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
  },
  header: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginBottom: 16, textAlign: 'right' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  typeButtonActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  typeButtonText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  typeButtonTextActive: { color: '#FFFFFF' },
  label: { color: '#64748B', fontSize: 14, marginBottom: 8, marginTop: 12, textAlign: 'right' },
  input: {
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  chipText: { color: '#64748B', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  dateButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButtonText: { color: '#0F172A', fontSize: 14, textAlign: 'center' },
  colorRow: { flexDirection: 'row', gap: 12 },
  colorCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorCircleActive: { borderColor: '#0F172A' },
  buttonRow: { flexDirection: 'row', marginTop: 24, marginBottom: 10, gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center' },
  cancelText: { color: '#334155', fontSize: 15 },
  submitButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center' },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});