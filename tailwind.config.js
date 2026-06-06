/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}", // Incluye todos los archivos HTML y TypeScript en src/
    "./public/**/*.html", // Incluye todos los archivos HTML en la carpeta public
  ],
  //darkMode: 'class',
  theme: {
    extend: {
      height: {
        112: "28rem",
        128: "32rem",
        160: "40rem",
      },
      width: {
        112: "28rem",
        128: "32rem",
        160: "40rem",
      },
      colors: {
        primary: {
          50: "#FCDCDC", // Versión más clara
          100: "#FAC9C9",
          200: "#F6A4A4",
          300: "#F37F7F",
          400: "#EF5959",
          500: "#EC3434", // Color principal
          600: "#D41414", // Tonalidades más oscuras
          700: "#A10F0F",
          800: "#6D0A0A",
          900: "#3A0505", // Más intensidad
          950: "#210303", // Última tonalidad más oscura
        },
        primaryOne: {
          50: "#FFEBEF",
          100: "#FFD6DF",
          200: "#FFA8BB",
          300: "#FF809B",
          400: "#FF577B",
          500: "#FF2A59",
          600: "#F00034",
          700: "#B30027",
          800: "#750019",
          900: "#3D000D",
          950: "#1F0007",
        },
        secondary: {
          50: "#f9fafb",
          100: "#e8eaed",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#8a96a3",
          600: "#3571a3",
          700: "#374151",
          800: "#374151",
          900: "#111827",
        },
        background: {
          dark: "#161618", //18181b
          light: "#f2f4f7", //f9f1ef
        },
        other: {
          whatsapp1: "#25d366",
          whatsapp2: "#1db154",
        },
        tertiary: {
          500: "#ff2a59",
        },
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ["group-hover"],
      // ...
    },
  },
  plugins: [],
};
