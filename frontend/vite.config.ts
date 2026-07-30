import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    charts: ['apexcharts', 'react-apexcharts'],
                    react: ['react', 'react-dom', 'react-router-dom'],
                    state: ['@reduxjs/toolkit', 'react-redux'],
                },
            },
        },
    },
});
