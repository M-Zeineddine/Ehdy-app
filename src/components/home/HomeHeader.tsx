import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { AppText } from '../ui/AppText';
import { Spacing } from '../../constants/layout';

interface HomeHeaderProps {
  firstName?: string;
  onNotificationPress?: () => void;
  unreadCount?: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeHeader({ firstName = 'There', onNotificationPress, unreadCount = 0 }: HomeHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <AppText variant="label" color={Colors.text.tertiary}>{getGreeting()},</AppText>
        <AppText variant="heading">{firstName}</AppText>
      </View>
      <TouchableOpacity onPress={onNotificationPress} style={styles.bell} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={22} color={Colors.text.primary} />
        {unreadCount > 0 && <View style={styles.badge} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { gap: 2 },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary, borderWidth: 1.5, borderColor: '#fff',
  },
});
