/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
        },
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#7C3AED',
                    light: '#F1EAFE',
                    'dark-light': 'rgba(124,58,237,.15)',
                },
                secondary: {
                    DEFAULT: '#F97316',
                    light: '#FFF0E5',
                    'dark-light': 'rgba(249,115,22,.15)',
                },
                success: {
                    DEFAULT: '#A855F7',
                    light: '#F5E8FF',
                    'dark-light': 'rgba(168,85,247,.15)',
                },
                danger: {
                    DEFAULT: '#F43F5E',
                    light: '#FFE4E9',
                    'dark-light': 'rgba(244,63,94,.15)',
                },
                warning: {
                    DEFAULT: '#F59E0B',
                    light: '#FFF3D6',
                    'dark-light': 'rgba(245,158,11,.15)',
                },
                info: {
                    DEFAULT: '#D946EF',
                    light: '#FBE8FE',
                    'dark-light': 'rgba(217,70,239,.15)',
                },
                dark: {
                    DEFAULT: '#3F3A56',
                    light: '#EEEAF5',
                    'dark-light': 'rgba(63,58,86,.15)',
                },
                black: {
                    DEFAULT: '#171421',
                    light: '#E5E1EB',
                    'dark-light': 'rgba(23,20,33,.15)',
                },
                white: {
                    DEFAULT: '#ffffff',
                    light: '#FAF8FC',
                    dark: '#777184',
                },
            },
            fontFamily: {
                nunito: ['Nunito', 'sans-serif'],
            },
            spacing: {
                4.5: '18px',
            },
            boxShadow: {
                '3xl': '0 2px 2px rgb(224 230 237 / 46%), 1px 6px 7px rgb(224 230 237 / 46%)',
            },
            typography: ({ theme }) => ({
                DEFAULT: {
                    css: {
                        '--tw-prose-invert-headings': theme('colors.white.dark'),
                        '--tw-prose-invert-links': theme('colors.white.dark'),
                        h1: { fontSize: '40px', marginBottom: '0.5rem', marginTop: 0 },
                        h2: { fontSize: '32px', marginBottom: '0.5rem', marginTop: 0 },
                        h3: { fontSize: '28px', marginBottom: '0.5rem', marginTop: 0 },
                        h4: { fontSize: '24px', marginBottom: '0.5rem', marginTop: 0 },
                        h5: { fontSize: '20px', marginBottom: '0.5rem', marginTop: 0 },
                        h6: { fontSize: '16px', marginBottom: '0.5rem', marginTop: 0 },
                        p: { marginBottom: '0.5rem' },
                        li: { margin: 0 },
                        img: { margin: 0 },
                    },
                },
            }),
        },
    },
    plugins: [
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
        require('@tailwindcss/typography'),
    ],
};