import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, SafeAreaView } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { List, LayoutGrid, User } from 'lucide-react-native';
import { store, persistor } from './src/store';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CreateRentalScreen from './src/screens/CreateRentalScreen';
import RentalDetailScreen from './src/screens/RentalDetailScreen';
import ReportPdfScreen from './src/screens/ReportPdfScreen';
import TemplateLibraryScreen from './src/screens/TemplateLibraryScreen';
import TemplateBuilderScreen from './src/screens/TemplateBuilderScreen';
import CreateReportScreen from './src/screens/CreateReportScreen';
import GenericReportDetailScreen from './src/screens/GenericReportDetailScreen';
import GenericReportPdfScreen from './src/screens/GenericReportPdfScreen';
import DrivingDetailScreen from './src/screens/DrivingDetailScreen';
import LegalDetailScreen from './src/screens/LegalDetailScreen';
import ServiceDetailScreen from './src/screens/ServiceDetailScreen';
import TradesDetailScreen from './src/screens/TradesDetailScreen';
import RehabDetailScreen from './src/screens/RehabDetailScreen';
import SignOffScreen from './src/screens/SignOffScreen';
import ReportComparisonScreen from './src/screens/ReportComparisonScreen';
import ReportChartsScreen from './src/screens/ReportChartsScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import { lightColors } from './src/theme/tokens';
import { initFirebase } from './src/services/firebaseConfig';
import { subscribeAuthState } from './src/services/authService';
import { initDatabase } from './src/services/sqliteService';
import { registerBackgroundSync } from './src/services/backgroundSyncTask';
import { setUser, selectIsAuthenticated } from './src/store/slices/authSlice';
import { registerForRemoteNotifications, addRemoteNotificationListener } from './src/services/notificationService';
import { importTemplate } from './src/store/slices/templatesSlice';
import { ENV } from './src/config/env';

// AdMob — lazy require so Expo Go doesn't crash
let mobileAds;
try {
  mobileAds = require('react-native-google-mobile-ads').default;
} catch {
  mobileAds = null;
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HEADER_OPTIONS = {
  headerStyle: { backgroundColor: lightColors.surface },
  headerTintColor: lightColors.textPrimary,
  headerTitleStyle: { fontWeight: '600', fontSize: 17 },
  headerBackTitleVisible: false,
};

function LoadingFallback() {
  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: lightColors.background }}>
      <ActivityIndicator size="large" color={lightColors.primary} />
    </SafeAreaView>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: true, title: 'Create Account', ...HEADER_OPTIONS }}
      />
    </Stack.Navigator>
  );
}

function ReportsStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="ReportsList" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CreateRental" component={CreateRentalScreen} options={{ title: 'New Rental Inspection' }} />
      <Stack.Screen name="ReportDetail" component={RentalDetailScreen} options={{ title: 'Inspection Report' }} />
      <Stack.Screen name="ReportPdf" component={ReportPdfScreen} options={{ title: 'Generate PDF' }} />
      <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: 'New Report' }} />
      <Stack.Screen name="GenericReportDetail" component={GenericReportDetailScreen} options={{ title: 'Report Details' }} />
      <Stack.Screen name="GenericReportPdf" component={GenericReportPdfScreen} options={{ title: 'Generate PDF' }} />
      <Stack.Screen name="DrivingDetail" component={DrivingDetailScreen} options={{ title: 'Driving Assessment' }} />
      <Stack.Screen name="LegalDetail" component={LegalDetailScreen} options={{ title: 'Legal & Forensic Report' }} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: 'Service Delivery' }} />
      <Stack.Screen name="TradesDetail" component={TradesDetailScreen} options={{ title: 'Trades Report' }} />
      <Stack.Screen name="RehabDetail" component={RehabDetailScreen} options={{ title: 'Rehabilitation Report' }} />
      <Stack.Screen name="SignOff" component={SignOffScreen} options={{ title: 'Digital Sign-Off' }} />
      <Stack.Screen name="ReportComparison" component={ReportComparisonScreen} options={{ title: 'Compare Reports' }} />
      <Stack.Screen name="ReportCharts" component={ReportChartsScreen} options={{ title: 'Report Analytics' }} />
    </Stack.Navigator>
  );
}

function TemplatesStack() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTIONS}>
      <Stack.Screen name="TemplateLibrary" component={TemplateLibraryScreen} options={{ title: 'Templates', headerShown: false }} />
      <Stack.Screen name="TemplateBuilder" component={TemplateBuilderScreen} options={{ title: 'Template Builder' }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: lightColors.surface,
          borderTopColor: lightColors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: lightColors.primary,
        tabBarInactiveTintColor: lightColors.textSecondary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeStack"
        component={ReportsStack}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color }) => <List size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="TemplatesTab"
        component={TemplatesStack}
        options={{
          tabBarLabel: 'Templates',
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} strokeWidth={2} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => <User size={24} color={color} strokeWidth={2} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Inner component — must be inside Provider so it can use Redux hooks
function AppContent() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Subscribe to Firebase auth state and sync to Redux.
  // Only handles real (non-anonymous) Firebase users — guest sessions are managed
  // locally by loginAsGuest and must not be overridden by anonymous Firebase UIDs.
  useEffect(() => {
    const unsubscribe = subscribeAuthState((firebaseUser) => {
      if (firebaseUser && !firebaseUser.isAnonymous) {
        dispatch(setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          isAnonymous: false,
        }));
      }
      // Don't clear Redux user on Firebase sign-out — logoutUser thunk handles that
    });
    return unsubscribe;
  }, [dispatch]);

  return (
    <NavigationContainer>
      {isAuthenticated ? <RootNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      await Promise.allSettled([
        initDatabase(),
        (async () => { initFirebase(); })(),
        mobileAds ? mobileAds().initialize() : Promise.resolve(),
        registerBackgroundSync(),
        registerForRemoteNotifications().catch(() => null),
      ]);
      setAppReady(true);
    }
    bootstrap();

    // Listen for incoming remote notifications while app is in foreground
    const sub = addRemoteNotificationListener((notification) => {
      const data = notification.request.content.data || {};
      if ((data.type === 'new_template' || data.type === 'template_update') && data.template) {
        store.dispatch(importTemplate(data.template));
      }
    });
    return () => sub.remove();
  }, []);

  if (!appReady) return <LoadingFallback />;

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingFallback />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}
