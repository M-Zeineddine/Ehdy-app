import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/src/components/ui/AppText';
import { Button } from '@/src/components/ui/Button';
import { Colors } from '@/src/constants/colors';
import { Spacing } from '@/src/constants/layout';

const LOGO = require('../../assets/images/kado_logo.png');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <AppText variant="body" color={Colors.text.secondary} style={styles.tagline}>
          Give gifts they'll actually love
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button label="Create Account" onPress={() => router.push('/(auth)/register')} size="lg" />
        <Button
          label="Sign In"
          onPress={() => router.push('/(auth)/login')}
          variant="outline"
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    width: 260, height: 180, marginBottom: -50
  },
  tagline: {
    textAlign: 'center',
  },
  actions: {
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
});



// import { useEffect, useRef } from 'react';
// import { View, StyleSheet, Animated, Easing } from 'react-native';
// import { useRouter } from 'expo-router';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { Ionicons } from '@expo/vector-icons';
// import { AppText } from '@/src/components/ui/AppText';
// import { Button } from '@/src/components/ui/Button';
// import { Colors } from '@/src/constants/colors';
// import { Spacing } from '@/src/constants/layout';

// function FloatingGift({
//   size, color, style, delay,
// }: {
//   size: number; color: string; style?: any; delay: number;
// }) {
//   const translateY = useRef(new Animated.Value(0)).current;

//   useEffect(() => {
//     Animated.loop(
//       Animated.sequence([
//         Animated.delay(delay),
//         Animated.timing(translateY, { toValue: -10, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
//         Animated.timing(translateY, { toValue: 0,   duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
//       ])
//     ).start();
//   }, []);

//   return (
//     <Animated.View style={[style, { transform: [{ translateY }] }]}>
//       <Ionicons name="gift" size={size} color={color} />
//     </Animated.View>
//   );
// }

// export default function WelcomeScreen() {
//   const router = useRouter();

//   return (
//     <SafeAreaView style={styles.container}>
//       <View style={styles.hero}>

//         {/* Floating gift boxes */}
//         <View style={styles.giftScene}>
//           {/* Back row */}
//           <FloatingGift size={48} color="#F0C4B4" style={styles.giftBackLeft}  delay={0} />
//           <FloatingGift size={40} color="#E8B5A0" style={styles.giftBackRight} delay={600} />

//           {/* Center large gift */}
//           <View style={styles.giftCenterWrap}>
//             <FloatingGift size={90} color={Colors.primary} style={styles.giftCenter} delay={300} />
//           </View>

//           {/* Front row */}
//           <FloatingGift size={36} color="#F5C9B8" style={styles.giftFrontLeft}  delay={900} />
//           <FloatingGift size={52} color={Colors.secondary} style={styles.giftFrontRight} delay={150} />

//           {/* Tiny accents */}
//           <FloatingGift size={22} color="#EDAA94" style={styles.giftTiny1} delay={450} />
//           <FloatingGift size={18} color="#F0C4B4" style={styles.giftTiny2} delay={750} />
//         </View>

//         {/* Brand */}
//         <AppText variant="title" style={styles.logo}>kado</AppText>
//         <AppText variant="body" color={Colors.text.secondary} style={styles.tagline}>
//           Give gifts they'll actually love
//         </AppText>
//       </View>

//       <View style={styles.actions}>
//         <Button label="Create Account" onPress={() => router.push('/(auth)/register')} size="lg" />
//         <Button
//           label="Sign In"
//           onPress={() => router.push('/(auth)/login')}
//           variant="outline"
//           size="lg"
//         />
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Colors.background,
//     paddingHorizontal: Spacing.lg,
//   },
//   hero: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: Spacing.sm,
//   },

//   giftScene: {
//     width: 260,
//     height: 200,
//     marginBottom: Spacing.lg,
//     position: 'relative',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },

//   // Back row (lighter, smaller)
//   giftBackLeft:  { position: 'absolute', top: 10,  left: 10 },
//   giftBackRight: { position: 'absolute', top: 20,  right: 20 },

//   // Center hero gift
//   giftCenterWrap: { position: 'absolute' },
//   giftCenter: {},

//   // Front row
//   giftFrontLeft:  { position: 'absolute', bottom: 10, left: 30 },
//   giftFrontRight: { position: 'absolute', bottom: 5,  right: 15 },

//   // Tiny floating accents
//   giftTiny1: { position: 'absolute', top: 0,   right: 55 },
//   giftTiny2: { position: 'absolute', bottom: 0, left: 60 },

//   logo: {
//     fontSize: 56,
//     color: Colors.primary,
//     letterSpacing: -2,
//   },
//   tagline: {
//     textAlign: 'center',
//   },
//   actions: {
//     paddingBottom: Spacing.xl,
//     gap: Spacing.sm,
//   },
// });
