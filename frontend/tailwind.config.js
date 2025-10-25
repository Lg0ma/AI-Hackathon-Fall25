/** @type {import('tailwindcss').Config} */
module.exports = {
    // 1. CONTENT: This is CRUCIAL. It tells Tailwind where to find your utility classes.
    // We specify all common file extensions used by React/TypeScript in the 'src' folder.
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    
    // 2. THEME: Where you define your project's design system (colors, fonts, spacing, etc.)
    theme: {
        // 'extend' is used to ADD custom values without overwriting the Tailwind defaults
        extend: {
        colors: {
            // Custom colors matching the Jale website's aesthetic
            'jale-blue': '#2563EB', // Vibrant blue for primary buttons/accents
            'jale-dark': '#0F172A', // Very dark color for header/dark backgrounds
        },
        // You can extend other properties here, like 'spacing', 'fontSize', etc.
        },
    },
    
    // 3. PLUGINS: Where you add any external Tailwind plugins
    plugins: [
        // You may add official plugins here, e.g., require('@tailwindcss/forms')
    ],
}