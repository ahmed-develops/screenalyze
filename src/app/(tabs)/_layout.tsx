import React from 'react';
import { View, StyleSheet, Easing } from 'react-native';
import { Tabs } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { LayoutDashboard, Clock, Settings } from 'lucide-react-native';
import { AppleGlassTabBar } from '../../components/AppleGlassTabBar';
import { StitchTheme } from '../../theme/stitchTheme';

export default function TabLayout() {
  return (
    <View style={styles.root}>
      {/* Permanent shared mountain wallpaper across all tabs */}
      <Image
        source={{ uri: StitchTheme.backdropUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        priority="high"
        cachePolicy="memory-disk"
        pointerEvents="none"
      />

      {/* Permanent shared dark scrim gradient overlay */}
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.40)',
          'rgba(0, 0, 0, 0.55)',
          'rgba(0, 0, 0, 0.82)',
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Tabs
        detachInactiveScreens={false}
        tabBar={(props) => <AppleGlassTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          lazy: false,
          freezeOnBlur: false,
          transitionSpec: {
            animation: 'timing',
            config: {
              duration: 220,
              easing: Easing.out(Easing.cubic),
            },
          },
          sceneStyleInterpolator: ({ current }) => ({
            sceneStyle: {
              opacity: current.progress.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              }),
            },
          }),
          sceneStyle: {
            backgroundColor: 'transparent',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Library',
            tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0D11',
  },
});
