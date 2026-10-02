import { createDrawerNavigator } from '@react-navigation/drawer';
import { colors } from '../theme/colors';
import DashboardScreen from '../screens/DashboardScreen';
import BoletosScreen from '../screens/BoletosScreen';
import ReportCardsScreen from '../screens/ReportCardsScreen';
import DrawerContent from './DrawerContent';

export type MainDrawerParamList = {
  Dashboard: undefined;
  Boletos: undefined;
  ReportCards: undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParamList>();

const MainDrawer = () => (
  <Drawer.Navigator
    drawerContent={(props) => <DrawerContent {...props} />}
    screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerShadowVisible: false,
      drawerStyle: { backgroundColor: colors.background, width: 260 },
      sceneStyle: { backgroundColor: colors.background },
    }}
  >
    <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Analytics' }} />
    <Drawer.Screen name="Boletos" component={BoletosScreen} options={{ title: 'Boletos' }} />
    <Drawer.Screen name="ReportCards" component={ReportCardsScreen} options={{ title: 'Boletins' }} />
  </Drawer.Navigator>
);

export default MainDrawer;
