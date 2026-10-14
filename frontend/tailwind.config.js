/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        // Identidade NexoDesk: azul corporativo sóbrio
        marinho: {
          DEFAULT: "#0F2A44", // barra lateral, títulos
          700: "#16365A",
          600: "#1E4470",
        },
        azul: {
          DEFAULT: "#1F5FAD", // ações principais, links
          escuro: "#194E8F",
          claro: "#E8F0FA",
        },
        aco: "#5B6B7F", // textos secundários
        nevoa: "#EEF2F6", // fundo do app
        borda: "#D9E0E8",
        // Sinais de prioridade (sempre acompanhados de rótulo)
        prioridade: {
          critica: "#B42318",
          alta: "#C4560E",
          media: "#B7791F",
          baixa: "#8A97A8",
        },
        // Séries dos gráficos (paleta validada para daltonismo e contraste)
        serie: {
          abertos: "#1F5FAD",
          resolvidos: "#178E70",
        },
      },
      boxShadow: {
        painel: "0 1px 2px rgba(15, 42, 68, 0.06)",
        flutuante: "0 12px 32px -8px rgba(15, 42, 68, 0.28)",
      },
      keyframes: {
        surgir: {
          from: { opacity: "0", transform: "translateY(6px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        deslizar: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "none" },
        },
      },
      animation: {
        surgir: "surgir 160ms ease-out",
        deslizar: "deslizar 200ms ease-out",
      },
    },
  },
  plugins: [],
};
