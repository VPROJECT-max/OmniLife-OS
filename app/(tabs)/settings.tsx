import { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AIProvider,
  ModelOption,
  getActiveProvider,
  getApiKey,
  getActiveModel,
  saveApiKey,
  saveProvider,
  saveModel,
  getProviderKeyHint,
  getProviderDocsUrl,
  getModelsForProvider,
} from '@/services/aiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, BorderRadius, FontSize, APP_VERSION } from '@/constants/Theme';

const PROVIDERS: {
  id: AIProvider;
  label: string;
  icon: string;
  color: string;
  description: string;
}[] = [
  { id: 'openai', label: 'OpenAI', icon: 'flash', color: '#10A37F', description: 'GPT-5.6 & GPT-6 series' },
  { id: 'gemini', label: 'Google Gemini', icon: 'sparkles', color: '#4285F4', description: 'Gemini 3.7 Flash series' },
];

const BADGE_COLOR: Record<string, string> = {
  Best: '#6C5CE7',
  Recommended: '#00B894',
  Cheapest: '#FDCB6E',
  Newest: '#FD79A8',
};

export default function SettingsScreen() {
  const [activeProvider, setActiveProvider] = useState<AIProvider>('openai');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({ openai: '', gemini: '' });
  const [activeModels, setActiveModels] = useState<Record<string, string>>({});
  const [visibleKey, setVisibleKey] = useState<Record<string, boolean>>({ openai: false, gemini: false });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [calorieTarget, setCalorieTarget] = useState('2000');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const provider = await getActiveProvider();
    setActiveProvider(provider);

    const keys: Record<string, string> = {};
    const models: Record<string, string> = {};
    for (const p of PROVIDERS) {
      const k = await getApiKey(p.id);
      keys[p.id] = k || '';
      models[p.id] = await getActiveModel(p.id);
    }
    setApiKeys(keys);
    setActiveModels(models);

    const target = await AsyncStorage.getItem('calorie_target');
    if (target) setCalorieTarget(target);
  };

  const handleSelectProvider = async (id: AIProvider) => {
    setActiveProvider(id);
    await saveProvider(id);
  };

  const handleSaveKey = async (provider: AIProvider) => {
    const key = apiKeys[provider];
    if (!key.trim()) { Alert.alert('Error', 'Please enter a valid API key.'); return; }
    setSavingKey(provider);
    await saveApiKey(provider, key);
    setTimeout(() => setSavingKey(null), 2000);
  };

  const handleSelectModel = async (provider: AIProvider, modelId: string) => {
    setActiveModels((prev) => ({ ...prev, [provider]: modelId }));
    await saveModel(provider, modelId);
  };

  const saveCalorieTarget = async () => {
    const val = parseInt(calorieTarget);
    if (isNaN(val) || val < 500 || val > 10000) { Alert.alert('Error', 'Enter a number between 500 and 10000.'); return; }
    await AsyncStorage.setItem('calorie_target', val.toString());
    Alert.alert('✅ Saved', `Daily target set to ${val} kcal.`);
  };

  const clearAllData = () => {
    Alert.alert('Clear All Data', 'This will permanently delete all meals, inventory, and tasks. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Everything',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['meals_log', 'home_inventory', 'chores_list']);
          Alert.alert('Cleared', 'All data has been deleted.');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Configure OmniLife OS</Text>

      {/* Provider Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip" size={20} color={Colors.primaryLight} />
          <Text style={styles.sectionTitle}>AI Provider</Text>
        </View>
        <Text style={styles.sectionHint}>Choose which AI powers your scanning features.</Text>
        <View style={styles.providerRow}>
          {PROVIDERS.map((p) => {
            const isActive = activeProvider === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.providerCard, isActive && { borderColor: p.color, backgroundColor: p.color + '15' }]}
                onPress={() => handleSelectProvider(p.id)}
              >
                <View style={[styles.providerIconWrap, { backgroundColor: p.color + '25' }]}>
                  <Ionicons name={p.icon as any} size={22} color={p.color} />
                </View>
                <Text style={[styles.providerLabel, isActive && { color: p.color }]}>{p.label}</Text>
                <Text style={styles.providerDesc}>{p.description}</Text>
                {isActive && (
                  <View style={[styles.activeBadge, { backgroundColor: p.color }]}>
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Per-provider: API key + Model selector */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key" size={20} color={Colors.warning} />
          <Text style={styles.sectionTitle}>API Keys & Models</Text>
        </View>
        <Text style={styles.sectionHint}>Your keys stay on this device only.</Text>

        {PROVIDERS.map((p) => {
          const isSaving = savingKey === p.id;
          const models = getModelsForProvider(p.id);
          const selectedModel = activeModels[p.id] || models[0]?.id;

          return (
            <View key={p.id} style={[styles.keyBlock, { borderLeftColor: p.color }]}>
              {/* Header */}
              <View style={styles.keyBlockHeader}>
                <Ionicons name={p.icon as any} size={16} color={p.color} />
                <Text style={[styles.keyBlockTitle, { color: p.color }]}>{p.label}</Text>
                <Text style={styles.keyBlockDocs}>{getProviderDocsUrl(p.id)}</Text>
              </View>

              {/* API Key input */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder={getProviderKeyHint(p.id)}
                  placeholderTextColor={Colors.textMuted}
                  value={apiKeys[p.id]}
                  onChangeText={(v) => setApiKeys((prev) => ({ ...prev, [p.id]: v }))}
                  secureTextEntry={!visibleKey[p.id]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setVisibleKey((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}>
                  <Ionicons name={visibleKey[p.id] ? 'eye-off' : 'eye'} size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.saveKeyBtn, isSaving && { backgroundColor: Colors.success }]}
                onPress={() => handleSaveKey(p.id)}
              >
                <Ionicons name={isSaving ? 'checkmark' : 'save'} size={15} color="#fff" />
                <Text style={styles.saveKeyBtnText}>{isSaving ? 'Saved!' : `Save ${p.label} Key`}</Text>
              </TouchableOpacity>

              {/* Model selector */}
              <Text style={styles.modelSelectorLabel}>Model</Text>
              {models.map((m: ModelOption) => {
                const isSelected = selectedModel === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modelRow, isSelected && { borderColor: p.color, backgroundColor: p.color + '10' }]}
                    onPress={() => handleSelectModel(p.id, m.id)}
                  >
                    <View style={styles.modelInfo}>
                      <Text style={[styles.modelName, isSelected && { color: p.color }]}>{m.label}</Text>
                      <Text style={styles.modelDesc}>{m.description}</Text>
                    </View>
                    {m.badge && (
                      <View style={[styles.modelBadge, { backgroundColor: (BADGE_COLOR[m.badge] || Colors.primary) + '25' }]}>
                        <Text style={[styles.modelBadgeText, { color: BADGE_COLOR[m.badge] || Colors.primary }]}>
                          {m.badge}
                        </Text>
                      </View>
                    )}
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={p.color} style={{ marginLeft: Spacing.sm }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>

      {/* Calorie Target */}
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
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.lg, padding: Spacing.lg,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  sectionHint: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },

  // Provider cards
  providerRow: { flexDirection: 'row', gap: Spacing.md },
  providerCard: {
    flex: 1, borderRadius: BorderRadius.lg, borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.sm,
  },
  providerIconWrap: { width: 48, height: 48, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  providerLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  providerDesc: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  activeBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: '#fff' },

  // Key blocks
  keyBlock: { borderLeftWidth: 3, paddingLeft: Spacing.md, marginBottom: Spacing.lg },
  keyBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  keyBlockTitle: { fontSize: FontSize.md, fontWeight: '700' },
  keyBlockDocs: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 'auto' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: {
    flex: 1, backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
  },
  eyeBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.bgInput,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  saveKeyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.sm, marginTop: Spacing.sm,
  },
  saveKeyBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: '#fff' },

  // Model selector
  modelSelectorLabel: {
    fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  modelRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  modelInfo: { flex: 1 },
  modelName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  modelDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  modelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  modelBadgeText: { fontSize: FontSize.xs, fontWeight: '700' },

  // Calorie
  saveBtnSecondary: {
    alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.primary,
  },
  saveBtnSecondaryText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.primary },

  // Danger
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.danger,
  },
  dangerBtnText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.danger },

  // About
  aboutSection: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: 4 },
  aboutName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  aboutVersion: { fontSize: FontSize.sm, color: Colors.textSecondary },
  aboutCopy: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.sm },
});
