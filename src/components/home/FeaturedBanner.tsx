import React from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/layout';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';

interface FeaturedBannerProps {
  onPress?: () => void;
}

const BANNER_IMAGE = 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=80';

export function FeaturedBanner({ onPress }: FeaturedBannerProps) {
  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.container}>
      <ImageBackground source={{ uri: BANNER_IMAGE }} style={styles.image} imageStyle={styles.imageStyle}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={styles.content}>
          <View style={styles.badge}>
            <AppText variant="label" color="#FFFFFF" style={styles.badgeText}>Featured Collection</AppText>
          </View>
          <AppText variant="heading" color="#FFFFFF" style={styles.title}>
            Curated local gifts{'\n'}for every occasion
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.8)" style={styles.subtitle}>
            Send instant joy with digital vouchers{'\n'}from Lebanon's best spots.
          </AppText>
          <Button label="Start Gifting" onPress={onPress} style={styles.btn} size="md" rightIcon={
            <AppText color="#fff" style={{ fontSize: 18, fontWeight: '600' }}> →</AppText>
          } />
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: Radius.xl, overflow: 'hidden', height: 220 },
  image: { flex: 1 },
  imageStyle: { borderRadius: Radius.xl },
  gradient: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1, justifyContent: 'flex-end', padding: Spacing.lg, gap: 6 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
    marginBottom: 4,
  },
  badgeText: { fontSize: 10 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  subtitle: { lineHeight: 18, marginBottom: 4 },
  btn: { alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: Spacing.lg },
});
