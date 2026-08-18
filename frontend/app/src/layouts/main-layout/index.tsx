import { useState, PropsWithChildren } from 'react';
import Stack from '@mui/material/Stack';
import ImpersonationBanner from 'components/ImpersonationBanner';
import Sidebar from 'layouts/main-layout/sidebar';
import Topbar from 'layouts/main-layout/topbar';
import Footer from './Footer';
import SkipLink from './SkipLink';

const MAIN_CONTENT_ID = 'main-content';

const MainLayout = ({ children }: PropsWithChildren) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  return (
    <Stack width={1} minHeight="100vh">
      <ImpersonationBanner />
      <SkipLink targetId={MAIN_CONTENT_ID}>Skip to main content</SkipLink>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} setIsClosing={setIsClosing} />
      <Stack
        component="main"
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        direction="column"
        p={{ xs: 2, sm: 3, lg: 5 }}
        spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}
        width={{ xs: 1, lg: `calc(100% - 300px)` }}
        flexGrow={1}
      >
        <Topbar isClosing={isClosing} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        {children}
        <Footer />
      </Stack>
    </Stack>
  );
};

export default MainLayout;
