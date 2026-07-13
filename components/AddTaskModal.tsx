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

export type Priority = 'کم' | 'متوسط' | 'زیاد' | 'خیلی زیاد';
export type Category =
  | 'درس'
  | 'کار'
  | 'شخصی'
  | 'سلامتی'
  | 'ورزش'
  | 'مالی'
  | 'خرید'
  | 'سایر';

export type NewTaskData = {
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  dueDate: Date | null;
};

const PRIORITIES: Priority[] = ['کم', 'متوسط', 'زیاد', 'خیلی زیاد'];
const CATEGORIES: Category[] = [
  'درس',
  'کار',
  'شخصی',
  'سلامتی',
  'ورزش',
  'مالی',
  'خرید',
  'سایر',
];

const PRIORITY_COLORS: Record<Priority, string> = {
  'کم': '#22C55E',
  'متوسط': '#EAB308',
  'زیاد': '#F97316',
  'خیلی زیاد': '#EF4444',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: NewTaskData) => void;
  initialData?: NewTaskData | null;
};

export default function AddTaskModal({
  visible,
  onClose,
  onSubmit,
  initialData,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('متوسط');
  const [category, setCategory] = useState<Category>('شخصی');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        setPriority(initialData.priority);
        setCategory(initialData.category);
        setDueDate(initialData.dueDate);
      } else {
        setTitle('');
        setDescription('');
        setPriority('متوسط');
        setCategory('شخصی');
        setDueDate(null);
      }
    }
  }, [visible, initialData]);

  const handleSubmit = () => {
    if (title.trim().length === 0) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      dueDate,
    });
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.header}>
              {isEditMode ? 'ویرایش کار' : 'کار جدید'}
            </Text>

            <Text style={styles.label}>عنوان</Text>
            <TextInput
              style={styles.input}
              placeholder="مثلاً خرید نان"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.label}>توضیحات</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="جزئیات کار..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.label}>تاریخ و ساعت سررسید</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={[styles.dateButton, { flex: 1 }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {dueDate ? formatDate(dueDate) : 'انتخاب تاریخ'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dateButton, { flex: 1 }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {dueDate ? formatTime(dueDate) : 'انتخاب ساعت'}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const base = dueDate || new Date();
                    const merged = new Date(selectedDate);
                    merged.setHours(base.getHours(), base.getMinutes());
                    setDueDate(merged);
                  }
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    const base = dueDate || new Date();
                    const merged = new Date(base);
                    merged.setHours(selectedTime.getHours(), selectedTime.getMinutes());
                    setDueDate(merged);
                  }
                }}
              />
            )}

            <Text style={styles.label}>اولویت</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.chip,
                    priority === p && {
                      backgroundColor: PRIORITY_COLORS[p],
                      borderColor: PRIORITY_COLORS[p],
                    },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[styles.chipText, priority === p && styles.chipTextActive]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>دسته‌بندی</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text
                    style={[styles.chipText, category === c && styles.chipTextActive]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>انصراف</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>
                  {isEditMode ? 'ذخیره تغییرات' : 'افزودن'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'right',
  },
  label: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
    textAlign: 'right',
  },
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
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateButtonText: {
    color: '#0F172A',
    fontSize: 14,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  chipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipText: {
    color: '#64748B',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 10,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelText: {
    color: '#334155',
    fontSize: 15,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});