import { View, Text, Pressable, StyleSheet, SafeAreaView, Platform, Share, Linking, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const SUPPORT_EMAIL = 'a385583p@gamil.com';
const APP_VERSION = '1.0.0';

function WatermarkBackground() {
  const rows = 16;
  const cols = 4;
  const items = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push(
        <Text
          key={`${r}-${c}`}
          style={[
            styles.watermarkText,
            { top: r * 70 + (c % 2 === 0 ? 0 : 35), left: c * 100 - 20 },
          ]}
        >
          385
        </Text>
      );
    }
  }
  return <View style={styles.watermarkWrap} pointerEvents="none">{items}</View>;
}

function AnimatedRow({
  icon,
  iconColors,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColors: [string, string];
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.97))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
    >
      <Animated.View style={[styles.row, animatedStyle]}>
        <LinearGradient
          colors={iconColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowText}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtext}>{subtitle}</Text> : null}
        </View>
        <Ionicons name="chevron-back" size={18} color="#CBD5E1" />
      </Animated.View>
    </Pressable>
  );
}

export default function AboutScreen() {
  const handleShare = async () => {
    try {
      await Share.share({
        message: 'اپ کارها و تایمر مطالعه رو امتحان کن! یه اپ ساده برای مدیریت کارها، تایمر مطالعه و یادداشت‌هاته.',
      });
    } catch (e) {
      console.log('خطا در اشتراک‌گذاری:', e);
    }
  };

  const handleSupport = () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=پشتیبانی اپ`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('ایمیل پشتیبانی', SUPPORT_EMAIL);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <WatermarkBackground />

      <LinearGradient
        colors={['#0F172A', '#1E293B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: Platform.OS === 'android' ? 40 : 20 }]}
      >
        <View style={styles.logoCircle}>
          <Ionicons name="checkbox" size={32} color="#3B82F6" />
        </View>
        <Text style={styles.appName}>کارها و تایمر مطالعه</Text>
        <Text style={styles.appTagline}>مدیریت کارها، تمرکز، و یادداشت‌ها در یک اپ</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.card}>
          <AnimatedRow
            icon="share-social"
            iconColors={['#3B82F6', '#2563EB']}
            title="اشتراک‌گذاری اپ"
            onPress={handleShare}
          />
          <View style={styles.divider} />
          <AnimatedRow
            icon="mail"
            iconColors={['#22C55E', '#16A34A']}
            title="پشتیبانی"
            subtitle={SUPPORT_EMAIL}
            onPress={handleSupport}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.versionCard}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.versionBadge}
          >
            <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
          </LinearGradient>
          <View>
            <Text style={styles.versionLabel}>نسخه برنامه</Text>
            <Text style={styles.versionNumber}>{APP_VERSION}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  watermarkWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  watermarkText: {
    position: 'absolute',
    fontSize: 22,
    fontWeight: 'bold',
    color: 'rgba(148, 163, 184, 0.10)',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    zIndex: 1,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  appTagline: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 6, textAlign: 'center' },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    zIndex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { fontSize: 15, color: '#0F172A', fontWeight: '600', textAlign: 'right' },
  rowSubtext: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 16 },
  versionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  versionBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionLabel: { fontSize: 12, color: '#94A3B8' },
  versionNumber: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 2 },
});