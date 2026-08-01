import { createDrawerNavigator } from '@react-navigation/drawer';
import { colors } from '../theme/colors';
import DashboardScreen from '../screens/DashboardScreen';
import DrawerContent from './DrawerContent';

export type MainDrawerParamList = {
  Dashboard: undefined;
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
  </Drawer.Navigator>
);

export default MainDrawer;
