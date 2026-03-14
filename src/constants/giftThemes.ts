export type DeliveryChannel = 'whatsapp' | 'sms' | 'email';

export interface ThemeDecoration {
  width: number;
  height: number;
  borderRadius: number;
  backgroundColor: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface GiftTheme {
  id: string;
  label: string;
  icon: any;
  gradient: [string, string];
  textColor: string;
  subtextColor: string;
  decorations: ThemeDecoration[];
}

export const GIFT_THEMES: GiftTheme[] = [
  {
    id: 'birthday',
    label: 'Birthday',
    icon: 'gift-outline',
    gradient: ['#FF6B6B', '#FF8E53'],
    textColor: '#fff',
    subtextColor: 'rgba(255,255,255,0.82)',
    decorations: [
      { width: 140, height: 140, borderRadius: 70, top: -45, right: -35, backgroundColor: 'rgba(255,255,255,0.15)' },
      { width: 90, height: 90, borderRadius: 45, bottom: -25, left: -25, backgroundColor: 'rgba(255,200,100,0.22)' },
      { width: 40, height: 40, borderRadius: 20, top: 28, left: 48, backgroundColor: 'rgba(255,255,255,0.12)' },
      { width: 20, height: 20, borderRadius: 10, top: 60, right: 75, backgroundColor: 'rgba(255,255,255,0.2)' },
    ],
  },
  {
    id: 'thankyou',
    label: 'Thank You',
    icon: 'heart-circle-outline',
    gradient: ['#11998e', '#38ef7d'],
    textColor: '#fff',
    subtextColor: 'rgba(255,255,255,0.82)',
    decorations: [
      { width: 160, height: 160, borderRadius: 80, top: -60, right: -50, backgroundColor: 'rgba(255,255,255,0.12)' },
      { width: 70, height: 70, borderRadius: 35, bottom: -20, right: 40, backgroundColor: 'rgba(100,255,200,0.2)' },
      { width: 30, height: 30, borderRadius: 15, top: 22, left: 30, backgroundColor: 'rgba(255,255,255,0.15)' },
    ],
  },
  {
    id: 'love',
    label: 'Love',
    icon: 'heart',
    gradient: ['#FF758C', '#FF7EB3'],
    textColor: '#fff',
    subtextColor: 'rgba(255,255,255,0.82)',
    decorations: [
      { width: 120, height: 120, borderRadius: 60, top: -35, left: -35, backgroundColor: 'rgba(255,255,255,0.15)' },
      { width: 100, height: 100, borderRadius: 50, bottom: -30, right: -30, backgroundColor: 'rgba(255,160,190,0.22)' },
      { width: 50, height: 50, borderRadius: 25, top: 18, right: 58, backgroundColor: 'rgba(255,255,255,0.1)' },
    ],
  },
  {
    id: 'thinking',
    label: 'Thinking',
    icon: 'chatbubble-ellipses-outline',
    gradient: ['#8360C3', '#7EB8F7'],
    textColor: '#fff',
    subtextColor: 'rgba(255,255,255,0.82)',
    decorations: [
      { width: 150, height: 150, borderRadius: 75, top: -50, right: -50, backgroundColor: 'rgba(255,255,255,0.1)' },
      { width: 60, height: 60, borderRadius: 30, bottom: 10, left: 15, backgroundColor: 'rgba(200,180,255,0.25)' },
      { width: 35, height: 35, borderRadius: 18, top: 14, left: 62, backgroundColor: 'rgba(255,255,255,0.12)' },
    ],
  },
  {
    id: 'congrats',
    label: 'Congrats',
    icon: 'trophy-outline',
    gradient: ['#F7971E', '#FFD200'],
    textColor: '#fff',
    subtextColor: 'rgba(255,255,255,0.82)',
    decorations: [
      { width: 130, height: 130, borderRadius: 65, top: -38, right: -38, backgroundColor: 'rgba(255,255,255,0.15)' },
      { width: 80, height: 80, borderRadius: 40, bottom: -20, left: -20, backgroundColor: 'rgba(255,220,100,0.2)' },
      { width: 40, height: 40, borderRadius: 20, top: 32, left: 80, backgroundColor: 'rgba(255,255,255,0.12)' },
      { width: 22, height: 22, borderRadius: 11, bottom: 28, right: 80, backgroundColor: 'rgba(255,255,255,0.18)' },
    ],
  },
  {
    id: 'sorry',
    label: 'Sorry',
    icon: 'sad-outline',
    gradient: ['#4568DC', '#B06AB3'],
    textColor: '#fff',
    subtextColor: 'rgba(255,255,255,0.82)',
    decorations: [
      { width: 160, height: 160, borderRadius: 80, top: -55, right: -55, backgroundColor: 'rgba(255,255,255,0.08)' },
      { width: 80, height: 80, borderRadius: 40, bottom: -15, left: 18, backgroundColor: 'rgba(180,150,255,0.2)' },
      { width: 45, height: 45, borderRadius: 23, top: 18, left: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
    ],
  },
];

export const DELIVERY_CHANNELS: { id: DeliveryChannel; label: string; icon: any }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'sms', label: 'SMS', icon: 'chatbubble-outline' },
  { id: 'email', label: 'Email', icon: 'mail-outline' },
];
