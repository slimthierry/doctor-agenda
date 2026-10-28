import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStore } from '../store/StoreContext';
import { colors, palette, radius, shadow } from '../theme';

export default function EstablishmentsScreen() {
  const {
    establishments,
    appointments,
    addEstablishment,
    removeEstablishment,
  } = useStore();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [color, setColor] = useState<string>(palette[0]);
  const [adding, setAdding] = useState(false);

  function onAdd() {
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Indiquez le nom de l\'établissement.');
      return;
    }
    addEstablishment(name.trim(), address.trim() || undefined, color);
    setName('');
    setAddress('');
    setColor(palette[(palette.indexOf(color as (typeof palette)[number]) + 1) % palette.length]);
    setAdding(false);
  }

  function onRemove(id: string, label: string) {
    const count = appointments.filter((a) => a.establishmentId === id).length;
    Alert.alert(
      'Supprimer',
      count > 0
        ? `"${label}" a ${count} rendez-vous associés qui resteront dans l\'historique. Supprimer ?`
        : `Supprimer "${label}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeEstablishment(id) },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Établissements</Text>
        <Text style={styles.subtitle}>
          Vos lieux d'exercice : chaque rendez-vous peut être rattaché à l'un d'eux.
        </Text>

        {establishments.map((est) => {
          const count = appointments.filter((a) => a.establishmentId === est.id).length;
          return (
            <View key={est.id} style={styles.card}>
              <View style={[styles.colorBar, { backgroundColor: est.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{est.name}</Text>
                {!!est.address && <Text style={styles.address}>{est.address}</Text>}
                <Text style={styles.count}>
                  {count} rendez-vous enregistrés
                </Text>
              </View>
              <Pressable
                onPress={() => onRemove(est.id, est.name)}
                hitSlop={8}
                style={styles.trash}
                accessibilityLabel={`Supprimer ${est.name}`}
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          );
        })}

        {adding ? (
          <View style={styles.form}>
            <Text style={styles.formLabel}>Nom</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex. Cabinet médical – Kara"
              placeholderTextColor={colors.textFaint}
              value={name}
              onChangeText={setName}
            />
            <Text style={styles.formLabel}>Adresse (facultatif)</Text>
            <TextInput
              style={styles.input}
              placeholder="Quartier, ville…"
              placeholderTextColor={colors.textFaint}
              value={address}
              onChangeText={setAddress}
            />
            <Text style={styles.formLabel}>Couleur</Text>
            <View style={styles.colorsRow}>
              {palette.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    color === c && styles.swatchActive,
                  ]}
                  accessibilityLabel={`Couleur ${c}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: color === c }}
                />
              ))}
            </View>
            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setAdding(false)} accessibilityLabel="Annuler" accessibilityRole="button">
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.addBtn} onPress={onAdd} accessibilityLabel="Ajouter l\'établissement" accessibilityRole="button">
                <Text style={styles.addText}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addCard} onPress={() => setAdding(true)} accessibilityLabel="Ajouter un établissement" accessibilityRole="button">
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addCardText}>Ajouter un établissement</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13.5, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...shadow.card,
  },
  colorBar: { width: 5, height: 44, borderRadius: 3 },
  name: { fontSize: 15.5, fontWeight: '700', color: colors.text },
  address: { fontSize: 13, color: colors.textMuted, marginTop: 1 },
  count: { fontSize: 11.5, color: colors.textFaint, marginTop: 3 },
  trash: { padding: 4 },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginTop: 6,
    backgroundColor: colors.primarySoft,
  },
  addCardText: { color: colors.primary, fontWeight: '700', fontSize: 14.5 },
  form: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 6,
    ...shadow.card,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 8,
  },
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
  colorsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  swatchActive: { borderWidth: 3, borderColor: colors.text },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.graySoft,
  },
  cancelText: { fontWeight: '700', color: colors.textMuted },
  addBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  addText: { fontWeight: '800', color: colors.white },
});
