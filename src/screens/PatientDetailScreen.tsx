import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { patientKey } from '../domain';
import AppointmentCard from '../components/AppointmentCard';
import { useStore } from '../store/StoreContext';
import { colors } from '../theme';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, 'PatientDetail'>;

export default function PatientDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const { appointments } = useStore();

  const patient = appointments.find(a => patientKey(a) === params.id);

  const history = appointments
    .filter(a => patientKey(a) === params.id)
    .sort((x, y) => y.date.localeCompare(x.date));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{patient?.patientName ?? 'Historique patient'}</Text>
        {history.length === 0 && <Text style={styles.empty}>Aucun rendez-vous trouvé.</Text>}
        {history.map(a => (
          <AppointmentCard
            key={a.id}
            appointment={a}
            onPress={() => navigation.navigate('AppointmentDetail', { id: a.id })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 14 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 30 },
});
