// Configurazione Tailwind condivisa da tutte le pagine.
// Deve restare uno script classico caricato subito dopo il Play CDN.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        accent: "#0c7ff2",
        paper: "#f4f3ee",
        ink: "#101010",
        marker: "#ffe66d"
      },
      fontFamily: {
        display: ["Bebas Neue", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"]
      },
      boxShadow: {
        brutal: "4px 4px 0 0 #000",
        "brutal-hover": "6px 6px 0 0 #000"
      }
    }
  }
};
