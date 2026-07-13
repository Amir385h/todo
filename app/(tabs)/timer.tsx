import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Vibration,
  ScrollView,
  Modal,
  AppState,
  Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import SessionLogModal from '../../components/SessionLogModal';
import { addSession, StudySession } from '../../utils/sessions';

type Phase = 'مطالعه' | 'استراحت کوتاه' | 'استراحت بلند';
type Status = 'idle' | 'running' | 'paused';
type Mode = 'پومودورو' | 'آزاد' | 'شمارش معکوس' | 'کرنومتر';

const MODES: Mode[] = ['پومودورو', 'آزاد', 'شمارش معکوس', 'کرنومتر'];

async function scheduleEndNotification(title: string, body: string, date: Date) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: 'default',
      },
    });
    return id;
  } catch (e) {
    console.log('خطا در زمان‌بندی نوتیف:', e);
    return null;
  }
}

async function cancelNotification(id: string | null) {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.log('خطا در لغو نوتیف:', e);
  }
}

function AnimatedButton({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.92))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function TimerScreen() {
  const [mode, setMode] = useState<Mode>('پومودورو');
  const [helpVisible, setHelpVisible] = useState(false);

  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [sessionTimerType, setSessionTimerType] = useState('');

  const [studyMinutes, setStudyMinutes] = useState('25');
  const [shortBreakMinutes, setShortBreakMinutes] = useState('5');
  const [longBreakMinutes, setLongBreakMinutes] = useState('15');
  const [cyclesCount, setCyclesCount] = useState('4');
  const [phase, setPhase] = useState<Phase>('مطالعه');
  const [status, setStatus] = useState<Status>('idle');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [completedCycles, setCompletedCycles] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimestampRef = useRef<number | null>(null);
  const pomodoroNotifIdRef = useRef<string | null>(null);
  const studySecondsAccumulatedRef = useRef(0);

  const [freeSeconds, setFreeSeconds] = useState(0);
  const [freeStatus, setFreeStatus] = useState<Status>('idle');
  const freeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const freeStartRef = useRef<number | null>(null);
  const freeAccumulatedRef = useRef(0);

  const [countdownInputMinutes, setCountdownInputMinutes] = useState('10');
  const [countdownSeconds, setCountdownSeconds] = useState(10 * 60);
  const [countdownStatus, setCountdownStatus] = useState<Status>('idle');
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownEndRef = useRef<number | null>(null);
  const countdownNotifIdRef = useRef<string | null>(null);
  const countdownTotalRef = useRef(0);

  const [stopwatchMs, setStopwatchMs] = useState(0);
  const [stopwatchStatus, setStopwatchStatus] = useState<Status>('idle');
  const [laps, setLaps] = useState<number[]>([]);
  const stopwatchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopwatchStartRef = useRef<number | null>(null);
  const stopwatchAccumulatedRef = useRef(0);

  useEffect(() => {
    if (status === 'idle' && phase === 'مطالعه') {
      const mins = parseInt(studyMinutes) || 0;
      setSecondsLeft(mins * 60);
    }
  }, [studyMinutes]);

  useEffect(() => {
    if (countdownStatus === 'idle') {
      const mins = parseInt(countdownInputMinutes) || 0;
      setCountdownSeconds(mins * 60);
    }
  }, [countdownInputMinutes]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        recalcPomodoro();
        recalcFree();
        recalcCountdown();
        recalcStopwatch();
      }
    });
    return () => sub.remove();
  }, []);

  const recalcPomodoro = () => {
    if (status === 'running' && endTimestampRef.current) {
      const remaining = Math.max(0, Math.round((endTimestampRef.current - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) handlePhaseEnd();
    }
  };

  const recalcFree = () => {
    if (freeStatus === 'running' && freeStartRef.current) {
      const elapsed = freeAccumulatedRef.current + Math.floor((Date.now() - freeStartRef.current) / 1000);
      setFreeSeconds(elapsed);
    }
  };

  const recalcCountdown = () => {
    if (countdownStatus === 'running' && countdownEndRef.current) {
      const remaining = Math.max(0, Math.round((countdownEndRef.current - Date.now()) / 1000));
      setCountdownSeconds(remaining);
      if (remaining === 0) handleCountdownEnd();
    }
  };

  const recalcStopwatch = () => {
    if (stopwatchStatus === 'running' && stopwatchStartRef.current) {
      const elapsed = stopwatchAccumulatedRef.current + (Date.now() - stopwatchStartRef.current);
      setStopwatchMs(elapsed);
    }
  };

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = setInterval(() => {
        if (!endTimestampRef.current) return;
        const remaining = Math.max(0, Math.round((endTimestampRef.current - Date.now()) / 1000));
        setSecondsLeft(remaining);
        if (remaining <= 0) handlePhaseEnd();
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  useEffect(() => {
    if (freeStatus === 'running') {
      freeIntervalRef.current = setInterval(() => {
        if (!freeStartRef.current) return;
        const elapsed = freeAccumulatedRef.current + Math.floor((Date.now() - freeStartRef.current) / 1000);
        setFreeSeconds(elapsed);
      }, 1000);
    } else {
      if (freeIntervalRef.current) clearInterval(freeIntervalRef.current);
    }
    return () => {
      if (freeIntervalRef.current) clearInterval(freeIntervalRef.current);
    };
  }, [freeStatus]);

  useEffect(() => {
    if (countdownStatus === 'running') {
      countdownIntervalRef.current = setInterval(() => {
        if (!countdownEndRef.current) return;
        const remaining = Math.max(0, Math.round((countdownEndRef.current - Date.now()) / 1000));
        setCountdownSeconds(remaining);
        if (remaining <= 0) handleCountdownEnd();
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [countdownStatus]);

  useEffect(() => {
    if (stopwatchStatus === 'running') {
      stopwatchIntervalRef.current = setInterval(() => {
        if (!stopwatchStartRef.current) return;
        const elapsed = stopwatchAccumulatedRef.current + (Date.now() - stopwatchStartRef.current);
        setStopwatchMs(elapsed);
      }, 100);
    } else {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    }
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current);
    };
  }, [stopwatchStatus]);

  const openSessionLog = (durationSeconds: number, timerType: string) => {
    if (durationSeconds <= 0) return;
    setSessionDuration(durationSeconds);
    setSessionTimerType(timerType);
    setSessionModalVisible(true);
  };

  const handleSessionSubmit = async (data: {
    subject: string;
    note: string;
    focus: number;
    fatigue: number;
    productivity: number;
  }) => {
    const session: StudySession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      durationSeconds: sessionDuration,
      timerType: sessionTimerType,
      ...data,
    };
    await addSession(session);
    setSessionModalVisible(false);
  };

  const handlePhaseEnd = async () => {
    if (phase === 'مطالعه') {
      studySecondsAccumulatedRef.current += (parseInt(studyMinutes) || 25) * 60;
      const newCompleted = completedCycles + 1;
      setCompletedCycles(newCompleted);
      const totalCycles = parseInt(cyclesCount) || 4;
      const isLongBreak = newCompleted % totalCycles === 0;
      const nextSeconds = isLongBreak
        ? (parseInt(longBreakMinutes) || 15) * 60
        : (parseInt(shortBreakMinutes) || 5) * 60;

      Vibration.vibrate([0, 400, 200, 400]);
      setPhase(isLongBreak ? 'استراحت بلند' : 'استراحت کوتاه');
      setSecondsLeft(nextSeconds);
      const nextEnd = Date.now() + nextSeconds * 1000;
      endTimestampRef.current = nextEnd;

      const nextTitle = isLongBreak ? 'وقت استراحت بلنده' : 'وقت استراحت کوتاهه';
      const id = await scheduleEndNotification('پایان زمان', nextTitle, new Date(nextEnd));
      pomodoroNotifIdRef.current = id;
    } else {
      const nextSeconds = (parseInt(studyMinutes) || 25) * 60;
      Vibration.vibrate([0, 400, 200, 400]);
      setPhase('مطالعه');
      setSecondsLeft(nextSeconds);
      const nextEnd = Date.now() + nextSeconds * 1000;
      endTimestampRef.current = nextEnd;

      const id = await scheduleEndNotification('پایان زمان', 'وقت مطالعه‌ست', new Date(nextEnd));
      pomodoroNotifIdRef.current = id;
    }
  };

  const handleCountdownEnd = () => {
    Vibration.vibrate([0, 400, 200, 400]);
    setCountdownStatus('idle');
    countdownEndRef.current = null;
    countdownNotifIdRef.current = null;
    openSessionLog(countdownTotalRef.current, 'شمارش معکوس');
  };

  const startTimer = async () => {
    let seconds = secondsLeft;
    if (status === 'idle') {
      seconds = (parseInt(studyMinutes) || 25) * 60;
      setSecondsLeft(seconds);
      setPhase('مطالعه');
      setCompletedCycles(0);
      studySecondsAccumulatedRef.current = 0;
    }
    const endTime = Date.now() + seconds * 1000;
    endTimestampRef.current = endTime;
    setStatus('running');
    const id = await scheduleEndNotification('پایان زمان', 'وقت مطالعه تموم شد', new Date(endTime));
    pomodoroNotifIdRef.current = id;
  };
  const pauseTimer = async () => {
    setStatus('paused');
    endTimestampRef.current = null;
    await cancelNotification(pomodoroNotifIdRef.current);
    pomodoroNotifIdRef.current = null;
  };
  const resumeTimer = async () => {
    const endTime = Date.now() + secondsLeft * 1000;
    endTimestampRef.current = endTime;
    setStatus('running');
    const title =
      phase === 'مطالعه' ? 'وقت مطالعه تموم شد' : phase === 'استراحت کوتاه' ? 'وقت استراحت کوتاه تموم شد' : 'وقت استراحت بلند تموم شد';
    const id = await scheduleEndNotification('پایان زمان', title, new Date(endTime));
    pomodoroNotifIdRef.current = id;
  };
  const endTimer = async () => {
    if (phase === 'مطالعه') {
      const studyTotal = (parseInt(studyMinutes) || 25) * 60;
      const partial = studyTotal - secondsLeft;
      if (partial > 0) studySecondsAccumulatedRef.current += partial;
    }
    setStatus('idle');
    setPhase('مطالعه');
    setSecondsLeft((parseInt(studyMinutes) || 25) * 60);
    setCompletedCycles(0);
    endTimestampRef.current = null;
    await cancelNotification(pomodoroNotifIdRef.current);
    pomodoroNotifIdRef.current = null;
    const totalStudied = studySecondsAccumulatedRef.current;
    studySecondsAccumulatedRef.current = 0;
    openSessionLog(totalStudied, 'پومودورو');
  };

  const startFreeTimer = () => {
    freeStartRef.current = Date.now();
    setFreeStatus('running');
  };
  const pauseFreeTimer = () => {
    if (freeStartRef.current) {
      freeAccumulatedRef.current += Math.floor((Date.now() - freeStartRef.current) / 1000);
    }
    freeStartRef.current = null;
    setFreeStatus('paused');
  };
  const resumeFreeTimer = () => {
    freeStartRef.current = Date.now();
    setFreeStatus('running');
  };
  const endFreeTimer = () => {
    const total = freeSeconds;
    setFreeStatus('idle');
    setFreeSeconds(0);
    freeStartRef.current = null;
    freeAccumulatedRef.current = 0;
    openSessionLog(total, 'آزاد');
  };

  const startCountdown = async () => {
    let seconds = countdownSeconds;
    if (countdownStatus === 'idle') {
      seconds = (parseInt(countdownInputMinutes) || 10) * 60;
      setCountdownSeconds(seconds);
      countdownTotalRef.current = seconds;
    }
    const endTime = Date.now() + seconds * 1000;
    countdownEndRef.current = endTime;
    setCountdownStatus('running');
    const id = await scheduleEndNotification('پایان شمارش معکوس', 'زمانی که تنظیم کرده بودی تموم شد', new Date(endTime));
    countdownNotifIdRef.current = id;
  };
  const pauseCountdown = async () => {
    setCountdownStatus('paused');
    countdownEndRef.current = null;
    await cancelNotification(countdownNotifIdRef.current);
    countdownNotifIdRef.current = null;
  };
  const resumeCountdown = async () => {
    const endTime = Date.now() + countdownSeconds * 1000;
    countdownEndRef.current = endTime;
    setCountdownStatus('running');
    const id = await scheduleEndNotification('پایان شمارش معکوس', 'زمانی که تنظیم کرده بودی تموم شد', new Date(endTime));
    countdownNotifIdRef.current = id;
  };
  const endCountdown = async () => {
    const elapsed = countdownTotalRef.current - countdownSeconds;
    setCountdownStatus('idle');
    setCountdownSeconds((parseInt(countdownInputMinutes) || 10) * 60);
    countdownEndRef.current = null;
    await cancelNotification(countdownNotifIdRef.current);
    countdownNotifIdRef.current = null;
    if (elapsed > 0) openSessionLog(elapsed, 'شمارش معکوس');
  };

  const startStopwatch = () => {
    stopwatchStartRef.current = Date.now();
    setStopwatchStatus('running');
  };
  const pauseStopwatch = () => {
    if (stopwatchStartRef.current) {
      stopwatchAccumulatedRef.current += Date.now() - stopwatchStartRef.current;
    }
    stopwatchStartRef.current = null;
    setStopwatchStatus('paused');
  };
  const resumeStopwatch = () => {
    stopwatchStartRef.current = Date.now();
    setStopwatchStatus('running');
  };
  const endStopwatch = () => {
    const totalSeconds = Math.floor(stopwatchMs / 1000);
    setStopwatchStatus('idle');
    setStopwatchMs(0);
    setLaps([]);
    stopwatchStartRef.current = null;
    stopwatchAccumulatedRef.current = 0;
    openSessionLog(totalSeconds, 'کرنومتر');
  };
  const recordLap = () => {
    setLaps(prev => [stopwatchMs, ...prev]);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    if (h > 0) return `${h}:${m}:${s}`;
    return `${m}:${s}`;
  };

  const formatStopwatch = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    const centis = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${m}:${s}.${centis}`;
  };

  const modeGradients: Record<Mode, [string, string]> = {
    'پومودورو': ['#3B82F6', '#2563EB'],
    'آزاد': ['#3B82F6', '#2563EB'],
    'شمارش معکوس': ['#EF4444', '#DC2626'],
    'کرنومتر': ['#8B5CF6', '#7C3AED'],
  };

  const phaseColor = phase === 'مطالعه' ? '#3B82F6' : phase === 'استراحت کوتاه' ? '#22C55E' : '#F97316';

  const helpTextForMode: Record<Mode, string> = {
    'پومودورو':
      'تکنیک پومودورو یعنی مطالعه در بازه‌های زمانی مشخص، همراه با استراحت‌های کوتاه بین هر بازه.\n\nوقتی «پایان» رو بزنی، فرم ثبت جلسه باز می‌شه.',
    'آزاد': 'تایمر آزاد فقط زمان سپری‌شده رو از صفر می‌شماره.',
    'شمارش معکوس': 'یه مدت زمان دلخواه مشخص می‌کنی و تایمر شمارش معکوس می‌کنه.',
    'کرنومتر': 'کرنومتر با دقت صدم ثانیه زمان رو اندازه می‌گیره و امکان ثبت دور داره.',
  };

  const gradientColors = modeGradients[mode];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Platform.OS === 'android' ? 40 : 20 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.header}>تایمر مطالعه</Text>
          <TouchableOpacity style={styles.helpButton} onPress={() => setHelpVisible(true)}>
            <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.modeSwitch}>
          {MODES.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeButton, mode === m && styles.modeButtonActive]}
              onPress={() => setMode(m)}
            >
              <Text style={[styles.modeButtonText, mode === m && styles.modeButtonTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {mode === 'پومودورو' && (
          <Animated.View entering={FadeIn.duration(250)} key="pomodoro">
            <View style={styles.timerCircle}>
              <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phase}</Text>
              <Text style={styles.timeText}>{formatTime(secondsLeft)}</Text>
              <Text style={styles.cycleText}>چرخه {completedCycles} از {cyclesCount}</Text>
            </View>

            <View style={styles.controlsRow}>
              {status === 'idle' && (
                <AnimatedButton style={styles.startButton} onPress={startTimer}>
                  <Text style={styles.startButtonText}>شروع</Text>
                </AnimatedButton>
              )}
              {status === 'running' && (
                <>
                  <AnimatedButton style={styles.pauseButton} onPress={pauseTimer}>
                    <Text style={styles.controlButtonText}>مکث</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endTimer}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
              {status === 'paused' && (
                <>
                  <AnimatedButton style={styles.startButton} onPress={resumeTimer}>
                    <Text style={styles.startButtonText}>ادامه</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endTimer}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
            </View>

            {status === 'idle' && (
              <View style={styles.settingsCard}>
                <Text style={styles.settingsHeader}>تنظیمات پومودورو</Text>
                <View style={styles.settingRow}>
                  <TextInput style={styles.settingInput} keyboardType="number-pad" value={studyMinutes} onChangeText={setStudyMinutes} />
                  <Text style={styles.settingLabel}>زمان مطالعه (دقیقه)</Text>
                </View>
                <View style={styles.settingRow}>
                  <TextInput style={styles.settingInput} keyboardType="number-pad" value={shortBreakMinutes} onChangeText={setShortBreakMinutes} />
                  <Text style={styles.settingLabel}>استراحت کوتاه (دقیقه)</Text>
                </View>
                <View style={styles.settingRow}>
                  <TextInput style={styles.settingInput} keyboardType="number-pad" value={longBreakMinutes} onChangeText={setLongBreakMinutes} />
                  <Text style={styles.settingLabel}>استراحت بلند (دقیقه)</Text>
                </View>
                <View style={[styles.settingRow, { marginBottom: 0 }]}>
                  <TextInput style={styles.settingInput} keyboardType="number-pad" value={cyclesCount} onChangeText={setCyclesCount} />
                  <Text style={styles.settingLabel}>تعداد چرخه</Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {mode === 'آزاد' && (
          <Animated.View entering={FadeIn.duration(250)} key="free">
            <View style={styles.timerCircle}>
              <Text style={[styles.phaseLabel, { color: '#3B82F6' }]}>در حال سپری شدن</Text>
              <Text style={styles.timeText}>{formatTime(freeSeconds)}</Text>
            </View>
            <View style={styles.controlsRow}>
              {freeStatus === 'idle' && (
                <AnimatedButton style={styles.startButton} onPress={startFreeTimer}>
                  <Text style={styles.startButtonText}>شروع</Text>
                </AnimatedButton>
              )}
              {freeStatus === 'running' && (
                <>
                  <AnimatedButton style={styles.pauseButton} onPress={pauseFreeTimer}>
                    <Text style={styles.controlButtonText}>مکث</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endFreeTimer}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
              {freeStatus === 'paused' && (
                <>
                  <AnimatedButton style={styles.startButton} onPress={resumeFreeTimer}>
                    <Text style={styles.startButtonText}>ادامه</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endFreeTimer}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
            </View>
          </Animated.View>
        )}

        {mode === 'شمارش معکوس' && (
          <Animated.View entering={FadeIn.duration(250)} key="countdown">
            <View style={styles.timerCircle}>
              <Text style={[styles.phaseLabel, { color: '#EF4444' }]}>شمارش معکوس</Text>
              <Text style={styles.timeText}>{formatTime(countdownSeconds)}</Text>
            </View>
            <View style={styles.controlsRow}>
              {countdownStatus === 'idle' && (
                <AnimatedButton style={styles.startButton} onPress={startCountdown}>
                  <Text style={styles.startButtonText}>شروع</Text>
                </AnimatedButton>
              )}
              {countdownStatus === 'running' && (
                <>
                  <AnimatedButton style={styles.pauseButton} onPress={pauseCountdown}>
                    <Text style={styles.controlButtonText}>مکث</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endCountdown}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
              {countdownStatus === 'paused' && (
                <>
                  <AnimatedButton style={styles.startButton} onPress={resumeCountdown}>
                    <Text style={styles.startButtonText}>ادامه</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endCountdown}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
            </View>
            {countdownStatus === 'idle' && (
              <View style={styles.settingsCard}>
                <Text style={styles.settingsHeader}>تنظیم زمان</Text>
                <View style={[styles.settingRow, { marginBottom: 0 }]}>
                  <TextInput style={styles.settingInput} keyboardType="number-pad" value={countdownInputMinutes} onChangeText={setCountdownInputMinutes} />
                  <Text style={styles.settingLabel}>مدت زمان (دقیقه)</Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {mode === 'کرنومتر' && (
          <Animated.View entering={FadeIn.duration(250)} key="stopwatch">
            <View style={styles.timerCircle}>
              <Text style={[styles.phaseLabel, { color: '#8B5CF6' }]}>کرنومتر</Text>
              <Text style={styles.timeText}>{formatStopwatch(stopwatchMs)}</Text>
            </View>
            <View style={styles.controlsRow}>
              {stopwatchStatus === 'idle' && (
                <AnimatedButton style={styles.startButton} onPress={startStopwatch}>
                  <Text style={styles.startButtonText}>شروع</Text>
                </AnimatedButton>
              )}
              {stopwatchStatus === 'running' && (
                <>
                  <AnimatedButton style={styles.lapButton} onPress={recordLap}>
                    <Text style={styles.controlButtonText}>ثبت دور</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.pauseButton} onPress={pauseStopwatch}>
                    <Text style={styles.controlButtonText}>مکث</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endStopwatch}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
              {stopwatchStatus === 'paused' && (
                <>
                  <AnimatedButton style={styles.startButton} onPress={resumeStopwatch}>
                    <Text style={styles.startButtonText}>ادامه</Text>
                  </AnimatedButton>
                  <AnimatedButton style={styles.endButton} onPress={endStopwatch}>
                    <Text style={styles.controlButtonText}>پایان</Text>
                  </AnimatedButton>
                </>
              )}
            </View>
            {laps.length > 0 && (
              <View style={styles.settingsCard}>
                <Text style={styles.settingsHeader}>دورها</Text>
                {laps.map((lapMs, index) => (
                  <View key={index} style={styles.lapRow}>
                    <Text style={styles.lapTime}>{formatStopwatch(lapMs)}</Text>
                    <Text style={styles.lapLabel}>دور {laps.length - index}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={helpVisible} animationType="fade" transparent>
        <View style={styles.helpOverlay}>
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>راهنمای «{mode}»</Text>
            <Text style={styles.helpText}>{helpTextForMode[mode]}</Text>
            <TouchableOpacity style={styles.helpCloseButton} onPress={() => setHelpVisible(false)}>
              <Text style={styles.helpCloseText}>متوجه شدم</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SessionLogModal
        visible={sessionModalVisible}
        durationSeconds={sessionDuration}
        timerType={sessionTimerType}
        onClose={() => setSessionModalVisible(false)}
        onSubmit={handleSessionSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  helpButton: { padding: 4 },
  modeSwitch: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  modeButtonActive: { backgroundColor: '#FFFFFF' },
  modeButtonText: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  modeButtonTextActive: { color: '#0F172A', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  timerCircle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 200,
    width: 260,
    height: 260,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    marginBottom: 32,
  },
  phaseLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center', paddingHorizontal: 20 },
  timeText: { fontSize: 44, fontWeight: 'bold', color: '#0F172A' },
  cycleText: { fontSize: 13, color: '#94A3B8', marginTop: 8 },
  controlsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  startButton: { backgroundColor: '#3B82F6', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 16 },
  startButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  pauseButton: { backgroundColor: '#F97316', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  lapButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 16 },
  endButton: { backgroundColor: '#EF4444', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  controlButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsHeader: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 14, textAlign: 'right' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  settingLabel: { fontSize: 14, color: '#334155' },
  settingInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    width: 60,
    textAlign: 'center',
    paddingVertical: 8,
    color: '#0F172A',
    fontSize: 15,
  },
  lapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  lapTime: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  lapLabel: { color: '#64748B', fontSize: 13 },
  helpOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  helpCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, width: '100%' },
  helpTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, textAlign: 'right' },
  helpText: { fontSize: 14, color: '#334155', lineHeight: 22, textAlign: 'right' },
  helpCloseButton: { backgroundColor: '#3B82F6', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 20 },
  helpCloseText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});