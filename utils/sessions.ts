import AsyncStorage from '@react-native-async-storage/async-storage';

export type StudySession = {
  id: string;
  date: string;
  durationSeconds: number;
  timerType: string;
  subject: string;
  note: string;
  focus: number;
  fatigue: number;
  productivity: number;
};

const KEY = 'STUDY_SESSIONS';

export async function loadSessions(): Promise<StudySession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.log('خطا در بارگذاری جلسات:', e);
    return [];
  }
}

export async function addSession(session: StudySession) {
  try {
    const sessions = await loadSessions();
    sessions.unshift(session);
    await AsyncStorage.setItem(KEY, JSON.stringify(sessions));
  } catch (e) {
    console.log('خطا در ذخیره جلسه:', e);
  }
}