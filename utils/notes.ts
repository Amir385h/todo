import AsyncStorage from '@react-native-async-storage/async-storage';

export type NoteColor = '#3B82F6' | '#22C55E' | '#F97316' | '#EF4444' | '#8B5CF6' | '#64748B';

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type GoalTerm = 'کوتاه‌مدت' | 'بلندمدت';

export type NoteOrGoal = {
  id: string;
  type: 'یادداشت' | 'هدف';
  title: string;
  content: string;
  color: NoteColor;
  checklist: ChecklistItem[];
  createdAt: string;
  term?: GoalTerm;
  progress?: number;
  targetDate?: string | null;
  reached?: boolean | null;
};

const KEY = 'NOTES_AND_GOALS';

export async function loadItems(): Promise<NoteOrGoal[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.log('خطا در بارگذاری یادداشت‌ها:', e);
    return [];
  }
}

export async function saveItems(items: NoteOrGoal[]) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.log('خطا در ذخیره یادداشت‌ها:', e);
  }
}