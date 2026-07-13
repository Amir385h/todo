import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { loadSessions, StudySession } from '../../utils/sessions';

type RangeKey = 'امروز' | 'هفته' | 'ماه' | 'سال' | 'کل';
const RANGES: RangeKey[] = ['امروز', 'هفته', 'ماه', 'سال', 'کل'];

type ChartType = 'ستونی' | 'خطی' | 'دایره‌ای';
const CHART_TYPES: ChartType[] = ['ستونی', 'خطی', 'دایره‌ای'];

type GroupBy = 'روز' | 'هفته' | 'ماه';
const GROUP_BY_OPTIONS: GroupBy[] = ['روز', 'هفته', 'ماه'];

const screenWidth = Dimensions.get('window').width - 40;

const PIE_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#EF4444', '#8B5CF6', '#EAB308', '#06B6D4', '#EC4899'];

export default function StatsScreen() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [range, setRange] = useState<RangeKey>('هفته');
  const [chartType, setChartType] = useState<ChartType>('ستونی');
  const [groupBy, setGroupBy] = useState<GroupBy>('روز');

  useFocusEffect(
    useCallback(() => {
      loadSessions().then(setSessions);
    }, [])
  );

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const startOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const filterByRange = (list: StudySession[], key: RangeKey) => {
    const now = new Date();
    return list.filter(s => {
      const d = new Date(s.date);
      if (key === 'امروز') return isSameDay(d, now);
      if (key === 'هفته') return d >= startOfWeek(now);
      if (key === 'ماه') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (key === 'سال') return d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const filteredSessions = filterByRange(sessions, range);
  const totalSeconds = filteredSessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const totalSessions = filteredSessions.length;
  const avgSeconds = totalSessions === 0 ? 0 : Math.round(totalSeconds / totalSessions);

  const dayTotals: Record<string, number> = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dayTotals[key] = (dayTotals[key] || 0) + s.durationSeconds;
  });
  const bestDaySeconds = Object.values(dayTotals).reduce((max, v) => (v > max ? v : max), 0);

  const allTimeTotalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
  const allTimeSessions = sessions.length;
  const allTimeAvg = allTimeSessions === 0 ? 0 : Math.round(allTimeTotalSeconds / allTimeSessions);

  const formatHoursMinutes = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h === 0 && m === 0) return '۰ دقیقه';
    if (h === 0) return `${m} دقیقه`;
    if (m === 0) return `${h} ساعت`;
    return `${h} ساعت و ${m} دقیقه`;
  };

  const formatDate = (isoDate: string) => new Date(isoDate).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
  const formatTime = (isoDate: string) => new Date(isoDate).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const buildDailyData = (daysBack: number) => {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const minutes = Math.round((dayTotals[key] || 0) / 60);
      labels.push(d.toLocaleDateString('fa-IR', { day: 'numeric' }));
      values.push(minutes);
    }
    return { labels, values };
  };

  const buildWeeklyData = (weeksBack: number) => {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let i = weeksBack - 1; i >= 0; i--) {
      const weekStart = startOfWeek(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const totalMinutes = Math.round(
        sessions.filter(s => {
          const d = new Date(s.date);
          return d >= weekStart && d < weekEnd;
        }).reduce((sum, s) => sum + s.durationSeconds, 0) / 60
      );
      labels.push(`ه${weeksBack - i}`);
      values.push(totalMinutes);
    }
    return { labels, values };
  };

  const buildMonthlyData = (monthsBack: number) => {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const totalMinutes = Math.round(
        sessions.filter(s => {
          const sd = new Date(s.date);
          return sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth();
        }).reduce((sum, s) => sum + s.durationSeconds, 0) / 60
      );
      labels.push(d.toLocaleDateString('fa-IR', { month: 'short' }));
      values.push(totalMinutes);
    }
    return { labels, values };
  };

  const chartData = groupBy === 'روز' ? buildDailyData(7) : groupBy === 'هفته' ? buildWeeklyData(6) : buildMonthlyData(6);
  const hasChartData = chartData.values.some(v => v > 0);

  // داده‌ی سازگار با react-native-gifted-charts برای نمودار ستونی/خطی
  const giftedBarLineData = chartData.labels.map((label, i) => ({
    value: chartData.values[i],
    label,
  }));

  const subjectTotals: Record<string, number> = {};
  sessions.forEach(s => {
    subjectTotals[s.subject] = (subjectTotals[s.subject] || 0) + s.durationSeconds;
  });
  const pieData = Object.entries(subjectTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, seconds], index) => ({
      name,
      minutes: Math.round(seconds / 60),
      color: PIE_COLORS[index % PIE_COLORS.length],
      legendFontColor: '#334155',
      legendFontSize: 12,
    }));

  // داده‌ی سازگار با react-native-gifted-charts برای نمودار دایره‌ای
  const giftedPieData = pieData.map(d => ({
    value: d.minutes,
    color: d.color,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#22C55E', '#16A34A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Platform.OS === 'android' ? 40 : 20 }]}
      >
        <Text style={styles.header}>آمار مطالعه</Text>
        <View style={styles.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeChip, range === r && styles.rangeChipActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[styles.rangeChipText, range === r && styles.rangeChipTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumber}>{totalSessions}</Text>
              <Text style={styles.summaryLabel}>تعداد جلسات</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumber}>{formatHoursMinutes(totalSeconds)}</Text>
              <Text style={styles.summaryLabel}>مجموع زمان</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryNumber}>{formatHoursMinutes(avgSeconds)}</Text>
              <Text style={styles.summaryLabel}>میانگین جلسه</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.sectionTitle}>آمار کلی (تمام دوران)</Text>
        <View style={styles.overallGrid}>
          {[
            { label: 'کل ساعات مطالعه', value: formatHoursMinutes(allTimeTotalSeconds) },
            { label: 'کل جلسات', value: allTimeSessions.toString() },
            { label: 'میانگین مطالعه', value: formatHoursMinutes(allTimeAvg) },
            { label: 'رکورد بهترین روز', value: formatHoursMinutes(bestDaySeconds) },
          ].map((card, i) => (
            <Animated.View
              key={card.label}
              entering={FadeInDown.delay(i * 60).springify()}
              style={styles.overallCard}
            >
              <Text style={styles.overallNumber}>{card.value}</Text>
              <Text style={styles.overallLabel}>{card.label}</Text>
            </Animated.View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>گزارش مطالعه</Text>
        <View style={styles.chartTypeRow}>
          {CHART_TYPES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.chartTypeChip, chartType === c && styles.chartTypeChipActive]}
              onPress={() => setChartType(c)}
            >
              <Text style={[styles.chartTypeText, chartType === c && styles.chartTypeTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {chartType !== 'دایره‌ای' && (
          <View style={styles.groupByRow}>
            {GROUP_BY_OPTIONS.map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.groupByChip, groupBy === g && styles.groupByChipActive]}
                onPress={() => setGroupBy(g)}
              >
                <Text style={[styles.groupByText, groupBy === g && styles.groupByTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.chartCard}>
          {chartType === 'ستونی' &&
            (hasChartData ? (
              <BarChart
                data={giftedBarLineData}
                width={screenWidth - 64}
                height={200}
                barWidth={22}
                spacing={24}
                initialSpacing={16}
                barBorderRadius={4}
                frontColor="#22C55E"
                yAxisThickness={0}
                xAxisThickness={0}
                xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10 }}
                yAxisTextStyle={{ color: '#64748B', fontSize: 10 }}
                rulesColor="#F1F5F9"
                noOfSections={4}
                showValuesAsTopLabel
                topLabelTextStyle={{ color: '#334155', fontSize: 10 }}
                yAxisLabelSuffix="د"
              />
            ) : (
              <Text style={styles.emptyChartText}>هنوز داده‌ای برای نمایش نیست</Text>
            ))}

          {chartType === 'خطی' &&
            (hasChartData ? (
              <LineChart
                data={giftedBarLineData}
                width={screenWidth - 64}
                height={200}
                thickness={2}
                color="#22C55E"
                curved
                areaChart
                startFillColor="#22C55E"
                startOpacity={0.15}
                endOpacity={0}
                initialSpacing={16}
                yAxisThickness={0}
                xAxisThickness={0}
                xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10 }}
                yAxisTextStyle={{ color: '#64748B', fontSize: 10 }}
                rulesColor="#F1F5F9"
                noOfSections={4}
                yAxisLabelSuffix="د"
                dataPointsColor="#22C55E"
              />
            ) : (
              <Text style={styles.emptyChartText}>هنوز داده‌ای برای نمایش نیست</Text>
            ))}

          {chartType === 'دایره‌ای' &&
            (pieData.length > 0 ? (
              <>
                <PieChart data={giftedPieData} radius={90} showText={false} />
                <View style={styles.legendWrap}>
                  {pieData.map(d => (
                    <View key={d.name} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                      <Text style={styles.legendText}>{d.name} · {d.minutes} د</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.emptyChartText}>هنوز داده‌ای برای نمایش نیست</Text>
            ))}
        </View>

        <Text style={styles.sectionTitle}>جلسات اخیر</Text>
        {filteredSessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>هنوز جلسه‌ای توی این بازه ثبت نشده</Text>
          </View>
        ) : (
          filteredSessions.map((session, i) => (
            <Animated.View key={session.id} entering={FadeInDown.delay(i * 40).springify()} style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <Text style={styles.sessionSubject}>{session.subject}</Text>
                <Text style={styles.sessionDate}>
                  {formatDate(session.date)} · {formatTime(session.date)}
                </Text>
              </View>
              <View style={styles.sessionMetaRow}>
                <Text style={styles.sessionMeta}>{session.timerType}</Text>
                <Text style={styles.sessionMeta}>{formatHoursMinutes(session.durationSeconds)}</Text>
              </View>
              {session.note ? <Text style={styles.sessionNote}>{session.note}</Text> : null}
              <View style={styles.scoreRow}>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>تمرکز</Text>
                  <Text style={[styles.scoreValue, { color: '#3B82F6' }]}>{session.focus}</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>خستگی</Text>
                  <Text style={[styles.scoreValue, { color: '#F97316' }]}>{session.fatigue}</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreLabel}>بهره‌وری</Text>
                  <Text style={[styles.scoreValue, { color: '#22C55E' }]}>{session.productivity}</Text>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
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
  header: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 14 },
  rangeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  rangeChipActive: { backgroundColor: '#FFFFFF' },
  rangeChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  rangeChipTextActive: { color: '#16A34A', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryBox: { alignItems: 'center', flex: 1 },
  summaryNumber: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', textAlign: 'center' },
  summaryLabel: { fontSize: 11, color: '#64748B', marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, textAlign: 'right' },
  overallGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  overallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  overallNumber: { fontSize: 16, fontWeight: 'bold', color: '#16A34A', textAlign: 'right' },
  overallLabel: { fontSize: 12, color: '#64748B', marginTop: 4, textAlign: 'right' },
  chartTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chartTypeChip: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  chartTypeChipActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  chartTypeText: { color: '#64748B', fontSize: 13 },
  chartTypeTextActive: { color: '#FFFFFF', fontWeight: '600' },
  groupByRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  groupByChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F1F5F9' },
  groupByChipActive: { backgroundColor: '#0F172A' },
  groupByText: { color: '#64748B', fontSize: 12 },
  groupByTextActive: { color: '#FFFFFF', fontWeight: '600' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 240,
    justifyContent: 'center',
  },
  emptyChartText: { color: '#94A3B8', fontSize: 14 },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#334155' },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionSubject: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  sessionDate: { fontSize: 12, color: '#94A3B8' },
  sessionMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sessionMeta: { fontSize: 13, color: '#64748B' },
  sessionNote: { fontSize: 13, color: '#334155', marginTop: 8, textAlign: 'right' },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  scoreItem: { alignItems: 'center', flex: 1 },
  scoreLabel: { fontSize: 11, color: '#94A3B8' },
  scoreValue: { fontSize: 15, fontWeight: 'bold', marginTop: 2 },
});