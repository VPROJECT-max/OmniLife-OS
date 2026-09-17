import { useState, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/Theme';

type MacroResult = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function HealthScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'menu' | 'camera' | 'preview'>('menu');
  const [photo, setPhoto] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [macros, setMacros] = useState<MacroResult | null>(null);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const cameraRef = useRef<any>(null);

  const loadTodayMeals = async () => {
    const mealsStr = await AsyncStorage.getItem('meals_log');
    if (mealsStr) {
      const meals = JSON.parse(mealsStr);
      const today = new Date().toDateString();
      setTodayMeals(
        meals
          .filter((m: any) => new Date(m.date).toDateString() === today)
          .reverse()
      );
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to scan meals.');
        return;
      }
    }
    setMode('camera');
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
      setBase64Data(result.assets[0].base64 || null);
      setMode('preview');
      if (result.assets[0].base64) {
        analyzePhoto(result.assets[0].base64);
      }
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });
      setPhoto(data.uri);
      setBase64Data(data.base64);
      setMode('preview');
      analyzePhoto(data.base64);
    }
  };

  const analyzePhoto = async (b64: string) => {
    setIsAnalyzing(true);
    try {
      const apiKey = await AsyncStorage.getItem('openai_api_key');
      if (!apiKey || apiKey.trim().length < 10) {
        Alert.alert(
          'API Key Missing',
          'Go to Settings tab and enter your OpenAI API key first.',
          [{ text: 'OK', onPress: () => { setMode('menu'); setPhoto(null); } }]
        );
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this food image. Identify the dish name and estimate calories, protein (g), carbs (g), fat (g). Return ONLY valid JSON: {"name":"dish name","calories":0,"protein":0,"carbs":0,"fat":0}. No markdown.',
                },
                {
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${b64}` },
                },
              ],
            },
          ],
          max_tokens: 200,
        }),
      });

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const content = json.choices[0].message.content.trim();
      const parsed = JSON.parse(content);
      setMacros(parsed);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e.message || 'Could not analyze the image.');
      setMode('menu');
      setPhoto(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!macros) return;
    const mealsStr = await AsyncStorage.getItem('meals_log');
    const meals = mealsStr ? JSON.parse(mealsStr) : [];
    meals.push({ ...macros, date: new Date().toISOString() });
    await AsyncStorage.setItem('meals_log', JSON.stringify(meals));
    Alert.alert('✅ Saved', `${macros.name} logged!`);
    setPhoto(null);
    setMacros(null);
    setMode('menu');
    loadTodayMeals();
  };

  // Camera mode
  if (mode === 'camera') {
    return (
      <View style={styles.container}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.cameraBackBtn} onPress={() => setMode('menu')}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.cameraBottom}>
              <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // Preview mode
  if (mode === 'preview' && photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={styles.previewOverlay}>
          {isAnalyzing ? (
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.analyzingText}>Analyzing your meal...</Text>
            </View>
          ) : macros ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultName}>{macros.name}</Text>
              <View style={styles.resultGrid}>
                <ResultChip label="Calories" value={`${macros.calories}`} unit="kcal" color={Colors.primary} />
                <ResultChip label="Protein" value={`${macros.protein}`} unit="g" color={Colors.secondary} />
                <ResultChip label="Carbs" value={`${macros.carbs}`} unit="g" color={Colors.warning} />
                <ResultChip label="Fat" value={`${macros.fat}`} unit="g" color={Colors.accent} />
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={saveMeal}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Save to Log</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() => { setPhoto(null); setMacros(null); setMode('menu'); }}
              >
                <Text style={styles.retakeBtnText}>Discard</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // Menu mode (default)
  loadTodayMeals();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Health & Meals</Text>
      <Text style={styles.subtitle}>Track your nutrition with AI</Text>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionCard} onPress={openCamera}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="camera" size={28} color={Colors.primary} />
          </View>
          <Text style={styles.actionLabel}>Snap Meal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={pickFromGallery}>
          <View style={[styles.actionIcon, { backgroundColor: Colors.secondary + '20' }]}>
            <Ionicons name="images" size={28} color={Colors.secondary} />
          </View>
          <Text style={styles.actionLabel}>From Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Today's meals */}
      <Text style={styles.sectionTitle}>Today's Meals</Text>
      {todayMeals.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="restaurant-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No meals logged yet today</Text>
          <Text style={styles.emptyHint}>Tap "Snap Meal" to get started</Text>
        </View>
      ) : (
        todayMeals.map((meal, idx) => (
          <View key={idx} style={styles.mealCard}>
            <View style={styles.mealHeader}>
              <Text style={styles.mealName}>{meal.name || 'Meal'}</Text>
              <Text style={styles.mealTime}>
                {new Date(meal.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={styles.mealMacros}>
              <Text style={[styles.mealMacro, { color: Colors.primary }]}>🔥 {meal.calories} kcal</Text>
              <Text style={[styles.mealMacro, { color: Colors.secondary }]}>💪 {meal.protein}g</Text>
              <Text style={[styles.mealMacro, { color: Colors.warning }]}>🍞 {meal.carbs}g</Text>
              <Text style={[styles.mealMacro, { color: Colors.accent }]}>🧈 {meal.fat}g</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ResultChip({ label, value, unit, color }: any) {
  return (
    <View style={styles.resultChip}>
      <Text style={[styles.resultValue, { color }]}>{value}</Text>
      <Text style={styles.resultUnit}>{unit}</Text>
      <Text style={styles.resultLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textMuted },
  mealCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  mealName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  mealTime: { fontSize: FontSize.sm, color: Colors.textSecondary },
  mealMacros: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  mealMacro: { fontSize: FontSize.sm, fontWeight: '600' },

  // Camera
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraBackBtn: {
    marginTop: 60,
    marginLeft: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBottom: { alignItems: 'center', marginBottom: 50 },
  shutterBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },

  // Preview
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    paddingBottom: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  analyzingCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  analyzingText: { fontSize: FontSize.lg, color: Colors.text, fontWeight: '600' },
  resultCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  resultName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  resultGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  resultChip: { alignItems: 'center', gap: 2 },
  resultValue: { fontSize: FontSize.xl, fontWeight: '800' },
  resultUnit: { fontSize: FontSize.xs, color: Colors.textSecondary },
  resultLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  saveBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  retakeBtn: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  retakeBtnText: { fontSize: FontSize.md, color: Colors.textSecondary },
});
