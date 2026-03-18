import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { AppText } from '../ui/AppText';
import { Spacing } from '../../constants/layout';
import { i18n } from '../../i18n';

interface HomeHeaderProps {
  firstName?: string;
  onNotificationPress?: () => void;
  unreadCount?: number;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return i18n('home.greetingMorning');
  if (h < 17) return i18n('home.greetingAfternoon');
  return i18n('home.greetingEvening');
}

export function HomeHeader({ firstName = 'There', onNotificationPress, unreadCount = 0 }: HomeHeaderProps) {
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      {/* Avatar + greeting */}
      <View style={styles.left}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <AppText style={styles.avatarText}>{initial}</AppText>
          </View>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.greetingCol}>
          <AppText variant="label" color={Colors.text.tertiary}>{getGreeting()},</AppText>
          <AppText variant="heading">{firstName}</AppText>
        </View>
      </View>

      {/* Bell */}
      <TouchableOpacity onPress={onNotificationPress} style={styles.bell} activeOpacity={0.55}>
        <Ionicons name="notifications-outline" size={24} color={Colors.text.primary} />
        {unreadCount > 0 && <View style={styles.badge} />}
      </TouchableOpacity>
    </View>
  );
}

const AVATAR_SIZE = 44;

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#4CAF50', borderWidth: 1.5, borderColor: '#fff',
  },
  greetingCol: { gap: 2 },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF3B30', borderWidth: 1.5, borderColor: '#fff',
  },
});
