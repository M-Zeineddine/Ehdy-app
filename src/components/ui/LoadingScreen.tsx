import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Image } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/layout';
import { i18n } from '../../i18n';

const LOGO = require('../../../assets/images/ehdy_logo.png');

export function LoadingScreen() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Fade in the whole screen
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Gentle pulse on the logo mark
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Staggered dot animation
    function animateDot(dot: Animated.Value, delay: number) {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1,   duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay(700 - delay),
        ])
      ).start();
    }

    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      {/* Logo */}
      <Animated.Image source={LOGO} style={[styles.logo, { transform: [{ scale: pulse }] }]} resizeMode="contain" />

      <Animated.Text style={styles.tagline}>{i18n('loading.tagline')}</Animated.Text>

      {/* Dots */}
      <View style={styles.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    width: 260, height: 180, marginBottom: -50
  },
  tagline: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.text.tertiary,
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
