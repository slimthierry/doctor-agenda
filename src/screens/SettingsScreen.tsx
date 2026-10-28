import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Clipboard,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Chip from '../components/Chip';
import {
  ensureNotificationPermission,
  scheduleReminder,
} from '../services/notifications';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchBookingInfo } from '../services/api';
import { useStore } from '../store/StoreContext';
import { colors, radius, shadow } from '../theme';
import { RootStackParamList } from '../types';
import { addDays, todayISO } from '../utils/date';

const LEADS = [15, 30, 60, 120];
type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const {
    settings,
    updateSettings,
    establishments,
    loadDemoData,
    appointments,
    syncNow,
    syncing,
  } = useStore();
  const [doctorName, setDoctorName] = useState(settings.doctorName);
  const [serverUrl, setServerUrl] = useState(settings.serverUrl ?? '');
  const [doctorApiKey, setDoctorApiKey] = useState(settings.doctorApiKey ?? '');
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);

  const serverBase = settings.serverUrl?.trim() ?? '';
  const doctorSlug = settings.doctorSlug;
  const bookingUrlResolved = serverBase && doctorSlug ? `${serverBase.replace(/\/+$/, '')}/b/${doctorSlug}` : null;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!serverBase || !doctorSlug) {
        setBookingUrl(null);
        return;
      }
      setLoadingLink(true);
      try {
        const info = await fetchBookingInfo(serverBase, settings.doctorApiKey ?? '', doctorSlug);
        const url = `${serverBase.replace(/\/+$/, '')}/b/${info.doctor.slug}`;
        if (!cancelled) setBookingUrl(url);
      } catch {
        if (!cancelled) setBookingUrl(bookingUrlResolved);
      } finally {
        if (!cancelled) setLoadingLink(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [serverBase, doctorSlug, settings.doctorApiKey, bookingUrlResolved]);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((p) => setNotifGranted(p.granted));
  }, []);

  async function onTestNotification() {
    const granted = await ensureNotificationPermission();
    setNotifGranted(granted);
    if (!granted) {
      Alert.alert(
        'Permission requise',
        "Autorisez les notifications dans les réglages du téléphone pour recevoir les rappels.",
      );
      return;
    }
    await scheduleReminder(
      {
        id: 'test',
        patientName: 'Patient de test',
        establishmentId: establishments[0]?.id ?? '',
        date: addDays(todayISO(), 1),
        time: '09:00',
        durationMin: 30,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      },
      settings,
    );
    Alert.alert('Notification envoyée', 'Un rappel de test vient d\'être programmé.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Réglages</Text>

        <Text style={styles.section}>Profil</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Nom du médecin</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex. Dr KPATCHA"
            placeholderTextColor={colors.textFaint}
            value={doctorName}
            onChangeText={setDoctorName}
            onEndEditing={() => updateSettings({ doctorName: doctorName.trim() })}
            returnKeyType="done"
          />
          <Text style={styles.hint}>
            Utilisé dans les messages de rappel envoyés aux patients.
          </Text>
        </View>

        <Text style={styles.section}>Établissement par défaut</Text>
        <View style={styles.card}>
          <View style={styles.wrap}>
            {establishments.map((est) => (
              <Chip
                key={est.id}
                label={est.name}
                color={est.color}
                active={est.id === settings.defaultEstablishmentId}
                onPress={() => updateSettings({ defaultEstablishmentId: est.id })}
                accessibilityLabel={`Établissement par défaut ${est.name}`}
              />
            ))}
          </View>
        </View>

        <Text style={styles.section}>Rappels push</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Prévenir le patient avant le rendez-vous</Text>
          <View style={styles.wrap}>
            {LEADS.map((lead) => (
              <Chip
                key={lead}
                label={lead >= 60 ? `${lead / 60} h` : `${lead} min`}
                active={lead === settings.reminderLeadMin}
                onPress={() => updateSettings({ reminderLeadMin: lead })}
                accessibilityLabel={`Rappel ${lead >= 60 ? `${lead / 60} heure` : `${lead} minutes`} avant`}
              />
            ))}
          </View>

          <View style={styles.permRow}>
            <Ionicons
              name={notifGranted ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={notifGranted ? colors.success : colors.warning}
            />
            <Text style={styles.permText}>
              {notifGranted === null
                ? 'Vérification des permissions…'
                : notifGranted
                  ? 'Notifications autorisées'
                  : 'Notifications non autorisées'}
            </Text>
          </View>

          <Pressable style={styles.testBtn} onPress={onTestNotification} accessibilityLabel="Tester la notification" accessibilityRole="button">
            <Ionicons name="notifications-outline" size={17} color={colors.white} />
            <Text style={styles.testText}>Tester la notification</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Mes horaires</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Disponibilités du médecin</Text>
          <Text style={styles.hint}>
            Les créneaux proposés aux patients (et dans votre agenda) sont calculés à partir
            de ces plages. Stockage local avec miroir serveur lors de la synchronisation.
          </Text>
          <Pressable
            style={styles.testBtn}
            onPress={() => navigation.navigate('Availability')}
            accessibilityLabel="Éditer mes horaires"
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={17} color={colors.white} />
            <Text style={styles.testText}>Éditer mes horaires</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Réservation en ligne</Text>
        <View style={styles.card}>
          {loadingLink ? (
            <View style={styles.linkRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.hint}>Chargement du lien…</Text>
            </View>
          ) : bookingUrl ? (
            <>
              <Text style={styles.label}>Lien de réservation patient</Text>
              <Text style={styles.linkValue}>{bookingUrl}</Text>
              <View style={styles.linkActions}>
                <Pressable
                  style={styles.linkBtn}
                  onPress={() => {
                    Clipboard.setString(bookingUrl);
                    Alert.alert('Lien copié', bookingUrl);
                  }}
                  accessibilityLabel="Copier le lien de réservation"
                  accessibilityRole="button"
                >
                  <Ionicons name="copy-outline" size={16} color={colors.white} />
                  <Text style={styles.linkBtnText}>Copier</Text>
                </Pressable>
                <Pressable
                  style={[styles.linkBtn, styles.linkBtnSecondary]}
                  onPress={() => {
                    void Share.share({ url: bookingUrl, title: 'Prenez rendez-vous' });
                  }}
                  accessibilityLabel="Partager le lien de réservation"
                  accessibilityRole="button"
                >
                  <Ionicons name="share-outline" size={16} color={colors.primary} />
                  <Text style={[styles.linkBtnText, styles.linkBtnTextSecondary]}>Partager</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Configurez l&apos;URL du serveur et la clé API pour obtenir le lien de
                réservation patient : {serverBase && doctorSlug ? `${serverBase}/b/${doctorSlug}` : '—'}.
              </Text>
            </>
          )}
        </View>

        <Text style={styles.section}>Agenda central (synchro)</Text>
        <View style={styles.card}>
          <Text style={styles.label}>URL du serveur</Text>
          <TextInput
            style={styles.input}
            placeholder="http://localhost:4400"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            value={serverUrl}
            onChangeText={setServerUrl}
            onEndEditing={() => updateSettings({ serverUrl: serverUrl.trim() })}
          />
          <Text style={styles.label}>Clé API médecin (X-Api-Key)</Text>
          <TextInput
            style={styles.input}
            placeholder="demo-key-kpatcha"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            value={doctorApiKey}
            onChangeText={setDoctorApiKey}
            onEndEditing={() => updateSettings({ doctorApiKey: doctorApiKey.trim() })}
          />

          <View style={styles.syncInfoRow}>
            <Ionicons
              name="cloud-done-outline"
              size={16}
              color={settings.lastSyncAt ? colors.success : colors.textFaint}
            />
            <Text style={styles.syncInfoText}>
              {settings.lastSyncAt
                ? `Dernière synchro : ${new Date(settings.lastSyncAt).toLocaleString('fr-FR')}`
                : 'Jamais synchronisé'}
            </Text>
          </View>

          <Pressable
            style={[styles.testBtn, syncing && { opacity: 0.6 }]}
            disabled={syncing}
            onPress={async () => {
              updateSettings({ serverUrl: serverUrl.trim(), doctorApiKey: doctorApiKey.trim() });
              const res = await syncNow();
              Alert.alert(res.ok ? 'Synchronisation' : 'Échec', res.message);
            }}
            accessibilityLabel="Synchroniser maintenant"
            accessibilityRole="button"
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="sync-outline" size={17} color={colors.white} />
            )}
            <Text style={styles.testText}>
              {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Données</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.demoBtn}
            onPress={() => {
              loadDemoData();
              Alert.alert('Chargé', 'Rendez-vous de démonstration ajoutés à l\'agenda.');
            }}
            accessibilityLabel="Charger des rendez-vous de démonstration"
            accessibilityRole="button"
          >
            <Ionicons name="sparkles-outline" size={17} color={colors.accent} />
            <Text style={styles.demoText}>
              Charger des rendez-vous de démonstration ({appointments.length} actuels)
            </Text>
          </Pressable>
        </View>

        <Text style={styles.about}>
          Doctor Agenda — LIKSOFT{'\n'}Agenda médecin multi-établissements
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  section: {
    fontSize: 12.5,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 2,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
    ...shadow.card,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  hint: { fontSize: 12, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  permText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  syncInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  syncInfoText: { fontSize: 12.5, color: colors.textMuted, flexShrink: 1 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: 4,
  },
  testText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  demoText: { color: colors.accent, fontWeight: '700', fontSize: 13.5 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkValue: { fontSize: 13, color: colors.text, backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10 },
  linkActions: { flexDirection: 'row', gap: 8 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14 },
  linkBtnSecondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  linkBtnText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  linkBtnTextSecondary: { color: colors.primary },
  about: {
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 28,
    lineHeight: 18,
  },
});
