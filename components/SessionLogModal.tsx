import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

const SUBJECT_SUGGESTIONS = ['ریاضی', 'برنامه‌نویسی', 'فیزیک', 'زبان'];

type Props = {
  visible: boolean;
  durationSeconds: number;
  timerType: string;
  onClose: () => void;
  onSubmit: (data: {
    subject: string;
    note: string;
    focus: number;
    fatigue: number;
    productivity: number;
  }) => void;
};

export default function SessionLogModal({
  visible,
  durationSeconds,
  timerType,
  onClose,
  onSubmit,
}: Props) {
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [focus, setFocus] = useState(7);
  const [fatigue, setFatigue] = useState(4);
  const [productivity, setProductivity] = useState(7);

  useEffect(() => {
    if (visible) {
      setSubject('');
      setNote('');
      setFocus(7);
      setFatigue(4);
      setProductivity(7);
    }
  }, [visible]);

  const formatDuration = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m === 0) return `${s} ثانیه`;
    if (s === 0) return `${m} دقیقه`;
    return `${m} دقیقه و ${s} ثانیه`;
  };

  const handleSubmit = () => {
    onSubmit({ subject: subject.trim() || 'نامشخص', note: note.trim(), focus, fatigue, productivity });
  };

  const renderScale = (
    label: string,
    value: number,
    setValue: (v: number) => void,
    color: string
  ) => (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.scaleRow}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
            <TouchableOpacity
              key={num}
              style={[
                styles.scaleCircle,
                value === num && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => setValue(num)}
            >
              <Text
                style={[
                  styles.scaleText,
                  value === num && styles.scaleTextActive,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.header}>ثبت جلسه مطالعه</Text>
            <Text style={styles.subHeader}>
              {timerType} · {formatDuration(durationSeconds)}
            </Text>

            <Text style={styles.label}>موضوع مطالعه</Text>
            <View style={styles.chipRow}>
              {SUBJECT_SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, subject === s && styles.chipActive]}
                  onPress={() => setSubject(s)}
                >
                  <Text
                    style={[styles.chipText, subject === s && styles.chipTextActive]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="یا موضوع دلخواه بنویس..."
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>یادداشت (اختیاری)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="نکته‌ای درباره این جلسه..."
              placeholderTextColor="#94A3B8"
              value={note}
              onChangeText={setNote}
              multiline
            />

            {renderScale('میزان تمرکز', focus, setFocus, '#3B82F6')}
            {renderScale('میزان خستگی', fatigue, setFatigue, '#F97316')}
            {renderScale('بهره‌وری', productivity, setProductivity, '#22C55E')}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>رد کردن</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>ثبت جلسه</Text>
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
    maxHeight: '88%',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'right',
  },
  subHeader: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  label: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 8,
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
    minHeight: 60,
    textAlignVertical: 'top',
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
  scaleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  scaleTextActive: {
    color: '#FFFFFF',
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