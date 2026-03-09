export const Colors = {
  primary: '#E8725B',       // terracotta coral
  secondary: '#C8956C',     // warm sand — subtle accents
  background: '#FCFAF8',    // warm off-white
  surface: '#F5F0EB',       // slightly warmer surface (input bg, pills)
  card: '#FFFFFF',          // cards stay white to pop against background
  text: {
    primary: '#1C1410',     // warm near-black
    secondary: '#7A6A62',   // warm medium brown
    tertiary: '#A89990',    // warm muted
    inverse: '#FFFFFF',
    accent: '#E8725B',
  },
  border: '#EDE8E3',        // warm light border
  star: '#F0A500',          // warm gold
  overlay: 'rgba(28,20,16,0.55)',
  tabBar: {
    active: '#E8725B',
    inactive: '#A89990',
    background: '#FFFFFF',
    border: '#EDE8E3',
  },
} as const;
