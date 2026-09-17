import { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, APP_VERSION } from '@/constants/Theme';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [calorieTarget, setCalorieTarget] = useState('2000');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const key = await AsyncStorage.getItem('openai_api_key');
    if (key) setApiKey(key);
    const target = await AsyncStorage.getItem('calorie_target');
    if (target) setCalorieTarget(target);
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key.');
      return;
    }
    await AsyncStorage.setItem('openai_api_key', apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveCalorieTarget = async () => {
    const val = parseInt(calorieTarget);
    if (isNaN(val) || val < 500 || val > 10000) {
      Alert.alert('Error', 'Enter a number between 500 and 10000.');
      return;
    }
    await AsyncStorage.setItem('calorie_target', val.toString());
    Alert.alert('✅ Saved', `Daily target set to ${val} kcal.`);
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all meals, inventory, and tasks. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'meals_log',
              'home_inventory',
              'chores_list',
            ]);
            Alert.alert('Cleared', 'All data has been deleted.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Configure OmniLife OS</Text>

      {/* API Key Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key" size={20} color={Colors.primary} />
          <Text style={styles.sectionTitle}>OpenAI API Key</Text>
        </View>
        <Text style={styles.sectionHint}>
          Required for AI meal scanning and inventory recognition. Get your key from{' '}
          <Text style={{ color: Colors.primary }}>platform.openai.com</Text>
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="sk-..."
            placeholderTextColor={Colors.textMuted}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry={!apiKeyVisible}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setApiKeyVisible(!apiKeyVisible)}
          >
            <Ionicons
              name={apiKeyVisible ? 'eye-off' : 'eye'}
              size={20}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saved && { backgroundColor: Colors.success }]}
          onPress={saveApiKey}
        >
          <Ionicons name={saved ? 'checkmark' : 'save'} size={18} color="#fff" />
          <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save API Key'}</Text>
        </TouchableOpacity>
      </View>

      {/* Calorie Target Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flame" size={20} color={Colors.warning} />
          <Text style={styles.sectionTitle}>Daily Calorie Target</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="2000"
          placeholderTextColor={Colors.textMuted}
          value={calorieTarget}
          onChangeText={setCalorieTarget}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.saveBtnSecondary} onPress={saveCalorieTarget}>
          <Text style={styles.saveBtnSecondaryText}>Update Target</Text>
        </TouchableOpacity>
      </View>

      {/* Data Management */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="server" size={20} color={Colors.danger} />
          <Text style={styles.sectionTitle}>Data Management</Text>
        </View>
        <TouchableOpacity style={styles.dangerBtn} onPress={clearAllData}>
          <Ionicons name="trash" size={18} color={Colors.danger} />
          <Text style={styles.dangerBtnText}>Clear All App Data</Text>
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.aboutSection}>
        <Text style={styles.aboutName}>OmniLife OS</Text>
        <Text style={styles.aboutVersion}>Version {APP_VERSION}</Text>
        <Text style={styles.aboutCopy}>Your personal life operating system</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  section: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  sectionHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bgInput,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  saveBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  saveBtnSecondary: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  saveBtnSecondaryText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  dangerBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.danger },
  aboutSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: 4,
  },
  aboutName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  aboutVersion: { fontSize: FontSize.sm, color: Colors.textSecondary },
  aboutCopy: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.sm },
});
