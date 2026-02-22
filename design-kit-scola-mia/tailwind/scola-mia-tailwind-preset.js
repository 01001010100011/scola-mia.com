/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        accent: '#0c7ff2',
        paper: '#f4f3ee',
        ink: '#101010',
        marker: '#ffe66d'
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif']
      },
      boxShadow: {
        brutal: '4px 4px 0 0 #000',
        brutalHover: '6px 6px 0 0 #000'
      },
      borderWidth: {
        2: '2px',
        4: '4px'
      },
      maxWidth: {
        site: '80rem'
      }
    }
  }
};
