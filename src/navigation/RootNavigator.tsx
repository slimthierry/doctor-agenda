import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, ActivityIndicator } from 'react-native';

import AppointmentDetailScreen from '../screens/AppointmentDetailScreen';
import AvailabilityScreen from '../screens/AvailabilityScreen';
import PatientDetailScreen from '../screens/PatientDetailScreen';
import AgendaScreen from '../screens/AgendaScreen';
import PatientsScreen from '../screens/PatientsScreen';
import EstablishmentsScreen from '../screens/EstablishmentsScreen';
import NewAppointmentScreen from '../screens/NewAppointmentScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useStore } from '../store/StoreContext';
import { colors } from '../theme';
import { RootStackParamList, TabParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.white,
    text: colors.text,
    border: colors.border,
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Agenda: 'calendar',
            Establishments: 'business',
            Patients: 'people',
            Settings: 'settings',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: 'Patients' }} />
      <Tab.Screen
        name="Establishments"
        component={EstablishmentsScreen}
        options={{ title: 'Établissements' }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Réglages' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { ready } = useStore();

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="NewAppointment"
          component={NewAppointmentScreen}
          options={{ title: 'Nouveau rendez-vous', presentation: 'modal' }}
        />
        <Stack.Screen
          name="AppointmentDetail"
          component={AppointmentDetailScreen}
          options={{ title: 'Rendez-vous' }}
        />
        <Stack.Screen
          name="Availability"
          component={AvailabilityScreen}
          options={{ title: 'Mes horaires' }}
        />
        <Stack.Screen
          name="PatientDetail"
          component={PatientDetailScreen}
          options={{ title: 'Patient' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
