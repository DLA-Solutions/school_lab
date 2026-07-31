import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import checker from 'vite-plugin-checker';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tsconfigPaths(),
        react(),
        checker({
            typescript: true,
            eslint: {
                useFlatConfig: true,
                lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
            },
            overlay: {
                initialIsOpen: false,
            },
        }),
    ],
    preview: {
        port: 4173,
    },
    server: {
        host: '0.0.0.0',
        // Matches the API's default CORS_ORIGINS (http://localhost:5173) so the refresh
        // cookie is accepted without extra backend configuration.
        port: 5173,
    },
    base: '/',
});
