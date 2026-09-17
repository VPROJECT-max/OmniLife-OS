import { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/Theme';

const ICON_OPTIONS = [
  { name: 'home', label: 'Home' },
  { name: 'car', label: 'Car' },
  { name: 'water', label: 'Plumbing' },
  { name: 'flame', label: 'HVAC' },
  { name: 'flash', label: 'Electric' },
  { name: 'leaf', label: 'Garden' },
  { name: 'paw', label: 'Pet' },
  { name: 'fitness', label: 'Fitness' },
  { name: 'medkit', label: 'Health' },
  { name: 'construct', label: 'Repair' },
  { name: 'trash', label: 'Clean' },
  { name: 'shield', label: 'Safety' },
];

const COLOR_OPTIONS = [
  Colors.primary,
  Colors.secondary,
  Colors.accent,
  Colors.warning,
  Colors.danger,
  Colors.success,
];

export default function ChoresScreen() {
  const [chores, setChores] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('home');
  const [newColor, setNewColor] = useState(Colors.primary);
  const [newRecurrence, setNewRecurrence] = useState('');

  useEffect(() => {
    loadChores();
  }, []);

  const loadChores = async () => {
    const data = await AsyncStorage.getItem('chores_list');
    if (data) {
      setChores(JSON.parse(data));
    } else {
      // Default chores to get started
      const defaults = [
        { id: Date.now().toString() + '1', title: 'Replace HVAC Filter', icon: 'flame', color: Colors.warning, recurrence: 'Every 3 months', completed: false, completedAt: null },
        { id: Date.now().toString() + '2', title: 'Test Smoke Alarms', icon: 'shield', color: Colors.danger, recurrence: 'Monthly', completed: false, completedAt: null },
        { id: Date.now().toString() + '3', title: 'Clean Gutters', icon: 'home', color: Colors.secondary, recurrence: 'Every 6 months', completed: false, completedAt: null },
        { id: Date.now().toString() + '4', title: 'Flush Water Heater', icon: 'water', color: Colors.primary, recurrence: 'Yearly', completed: false, completedAt: null },
      ];
      setChores(defaults);
      await AsyncStorage.setItem('chores_list', JSON.stringify(defaults));
    }
  };

  const toggleChore = async (id: string) => {
    const updated = chores.map((c) =>
      c.id === id
        ? { ...c, completed: !c.completed, completedAt: !c.completed ? new Date().toISOString() : null }
        : c
    );
    setChores(updated);
    await AsyncStorage.setItem('chores_list', JSON.stringify(updated));
  };

  const deleteChore = async (id: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = chores.filter((c) => c.id !== id);
          setChores(updated);
          await AsyncStorage.setItem('chores_list', JSON.stringify(updated));
        },
      },
    ]);
  };

  const addChore = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a task name.');
      return;
    }
    const newChore = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      icon: newIcon,
      color: newColor,
      recurrence: newRecurrence || 'One-time',
      completed: false,
      completedAt: null,
    };
    const updated = [...chores, newChore];
    setChores(updated);
    await AsyncStorage.setItem('chores_list', JSON.stringify(updated));
    setNewTitle('');
    setNewIcon('home');
    setNewColor(Colors.primary);
    setNewRecurrence('');
    setShowAddModal(false);
  };

  const completedCount = chores.filter((c) => c.completed).length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Tasks & Maintenance</Text>
        <Text style={styles.subtitle}>
          {completedCount}/{chores.length} completed
        </Text>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: chores.length > 0 ? `${(completedCount / chores.length) * 100}%` : '0%' },
            ]}
          />
        </View>

        {chores.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptyHint}>Tap + to add your first task</Text>
          </View>
        ) : (
          chores.map((chore) => (
            <TouchableOpacity
              key={chore.id}
              style={styles.choreCard}
              onPress={() => toggleChore(chore.id)}
              onLongPress={() => deleteChore(chore.id)}
            >
              <View style={[styles.choreIcon, { backgroundColor: chore.color + '20' }]}>
                <Ionicons name={chore.icon as any} size={22} color={chore.color} />
              </View>
              <View style={styles.choreInfo}>
                <Text
                  style={[styles.choreTitle, chore.completed && styles.choreCompleted]}
                >
                  {chore.title}
                </Text>
                <Text style={styles.choreRecurrence}>
                  {chore.recurrence}
                  {chore.completedAt &&
                    ` · Done ${new Date(chore.completedAt).toLocaleDateString()}`}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  chore.completed && { backgroundColor: Colors.success, borderColor: Colors.success },
                ]}
              >
                {chore.completed && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Task Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Change car oil"
              placeholderTextColor={Colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.fieldLabel}>Recurrence</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Monthly, Every 3 months"
              placeholderTextColor={Colors.textMuted}
              value={newRecurrence}
              onChangeText={setNewRecurrence}
            />

            <Text style={styles.fieldLabel}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconRow}>
              {ICON_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.name}
                  style={[
                    styles.iconOption,
                    newIcon === opt.name && { borderColor: Colors.primary, backgroundColor: Colors.primary + '20' },
                  ]}
                  onPress={() => setNewIcon(opt.name)}
                >
                  <Ionicons name={opt.name as any} size={20} color={newIcon === opt.name ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.iconLabel, newIcon === opt.name && { color: Colors.primary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    newColor === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={addChore}>
              <Text style={styles.addBtnText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 120 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.md },
  progressBar: {
    height: 6,
    backgroundColor: Colors.bgInput,
    borderRadius: 3,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 3,
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
  choreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  choreIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreInfo: { flex: 1 },
  choreTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  choreCompleted: { textDecorationLine: 'line-through', color: Colors.textMuted },
  choreRecurrence: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    paddingBottom: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  iconOption: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    gap: 4,
  },
  iconLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  colorRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  addBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
});
