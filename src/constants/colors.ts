export const Colors = {
  primary: '#F07856',       // terracotta coral
  secondary: '#C8956C',     // warm sand — subtle accents
  background: '#F9F6F2',    // warm off-white
  surface: '#F5F0EB',       // slightly warmer surface (input bg, pills)
  card: '#FFFFFF',          // cards stay white to pop against background
  text: {
    primary: '#1C1410',     // warm near-black
    secondary: '#7A6A62',   // warm medium brown
    tertiary: '#A89990',    // warm muted
    inverse: '#FFFFFF',
    accent: '#F07856',
  },
  border: '#EDE8E3',        // warm light border
  star: '#F0A500',          // warm gold
  error: '#E53935',
  overlay: 'rgba(28,20,16,0.55)',
  tabBar: {
    active: '#F07856',
    inactive: '#A89990',
    background: '#FFFFFF',
    border: '#EDE8E3',
  },
} as const;
