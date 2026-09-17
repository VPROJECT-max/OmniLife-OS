import { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, Link } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, APP_VERSION } from '@/constants/Theme';

export default function DashboardScreen() {
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);
  const [totalCarbs, setTotalCarbs] = useState(0);
  const [totalFat, setTotalFat] = useState(0);
  const [mealCount, setMealCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [choresDone, setChoresDone] = useState(0);
  const [choresTotal, setChoresTotal] = useState(0);
  const [calorieTarget, setCalorieTarget] = useState(2000);

  const loadData = async () => {
    try {
      // Load meals
      const mealsStr = await AsyncStorage.getItem('meals_log');
      if (mealsStr) {
        const meals = JSON.parse(mealsStr);
        const today = new Date().toDateString();
        const todayMeals = meals.filter(
          (m: any) => new Date(m.date).toDateString() === today
        );
        setTotalCalories(todayMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0));
        setTotalProtein(todayMeals.reduce((s: number, m: any) => s + (m.protein || 0), 0));
        setTotalCarbs(todayMeals.reduce((s: number, m: any) => s + (m.carbs || 0), 0));
        setTotalFat(todayMeals.reduce((s: number, m: any) => s + (m.fat || 0), 0));
        setMealCount(todayMeals.length);
      } else {
        setTotalCalories(0);
        setTotalProtein(0);
        setTotalCarbs(0);
        setTotalFat(0);
        setMealCount(0);
      }

      // Load inventory
      const invStr = await AsyncStorage.getItem('home_inventory');
      if (invStr) setInventoryCount(JSON.parse(invStr).length);
      else setInventoryCount(0);

      // Load chores
      const choresStr = await AsyncStorage.getItem('chores_list');
      if (choresStr) {
        const chores = JSON.parse(choresStr);
        setChoresTotal(chores.length);
        setChoresDone(chores.filter((c: any) => c.completed).length);
      }

      // Load calorie target
      const target = await AsyncStorage.getItem('calorie_target');
      if (target) setCalorieTarget(parseInt(target));
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const caloriePercent = Math.min((totalCalories / calorieTarget) * 100, 100);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {getGreeting()} 👋</Text>
          <Text style={styles.subtitle}>Here's your daily overview</Text>
        </View>
        <Link href="/modal" asChild>
          <TouchableOpacity style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </Link>
      </View>

      {/* Calorie Ring Card */}
      <View style={styles.calorieCard}>
        <View style={styles.ringOuter}>
          <View style={[styles.ringProgress, { transform: [{ rotate: `${(caloriePercent * 3.6)}deg` }] }]} />
          <View style={styles.ringInner}>
            <Text style={styles.ringCalories}>{totalCalories}</Text>
            <Text style={styles.ringLabel}>/ {calorieTarget} kcal</Text>
          </View>
        </View>
        <View style={styles.macroRow}>
          <MacroChip icon="flame" label="Protein" value={`${totalProtein}g`} color={Colors.secondary} />
          <MacroChip icon="nutrition" label="Carbs" value={`${totalCarbs}g`} color={Colors.warning} />
          <MacroChip icon="water" label="Fat" value={`${totalFat}g`} color={Colors.accent} />
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="restaurant"
          label="Meals Today"
          value={`${mealCount}`}
          color={Colors.primary}
        />
        <StatCard
          icon="cube"
          label="Inventory"
          value={`${inventoryCount} items`}
          color={Colors.secondary}
        />
        <StatCard
          icon="checkmark-circle"
          label="Tasks Done"
          value={`${choresDone}/${choresTotal}`}
          color={Colors.success}
        />
        <StatCard
          icon="sparkles"
          label="Version"
          value={`v${APP_VERSION}`}
          color={Colors.accent}
        />
      </View>
    </ScrollView>
  );
}

function MacroChip({ icon, label, value, color }: any) {
  return (
    <View style={styles.macroChip}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, label, value, color }: any) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.md,
  },
  greeting: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4 },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ringOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    borderColor: Colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  ringProgress: { position: 'absolute', width: '100%', height: '100%' },
  ringInner: { alignItems: 'center' },
  ringCalories: { fontSize: 40, fontWeight: '800', color: Colors.text },
  ringLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  macroChip: { alignItems: 'center', gap: 4 },
  macroValue: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  macroLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    width: '47%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
