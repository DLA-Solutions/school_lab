import { Outlet } from 'react-router';
import ActiveMembershipProvider from 'providers/ActiveMembershipProvider';

const App = () => {
  return (
    <ActiveMembershipProvider>
      <Outlet />
    </ActiveMembershipProvider>
  );
};

export default App;
