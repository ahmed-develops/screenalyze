import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Clock, Settings } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export interface TabRoute {
  key: string;
  name: string;
  params?: object;
}

export interface AppleGlassTabBarProps {
  state: {
    index: number;
    routes: readonly TabRoute[] | TabRoute[];
  };
  navigation: {
    emit: (event: any) => any;
    navigate: (name: any, params?: any) => void;
  };
}

interface TabItemProps {
  route: TabRoute;
  isFocused: boolean;
  isDark: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ route, isFocused, isDark, onPress, onLongPress }) => {
  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.90,
      damping: 15,
      stiffness: 280,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 12,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const renderIcon = (color: string) => {
    const iconSize = 18;
    switch (route.name) {
      case 'index':
        return <LayoutDashboard size={iconSize} color={color} strokeWidth={isFocused ? 2.4 : 1.8} />;
      case 'history':
        return <Clock size={iconSize} color={color} strokeWidth={isFocused ? 2.4 : 1.8} />;
      case 'settings':
        return <Settings size={iconSize} color={color} strokeWidth={isFocused ? 2.4 : 1.8} />;
      default:
        return <LayoutDashboard size={iconSize} color={color} />;
    }
  };

  const getLabel = () => {
    switch (route.name) {
      case 'index':
        return 'Home';
      case 'history':
        return 'Library';
      case 'settings':
        return 'Settings';
      default:
        return route.name;
    }
  };

  const activeColor = isDark ? '#ffffff' : '#4F46E5';
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.48)' : 'rgba(15, 23, 42, 0.45)';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={`${getLabel()} tab`}
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale: scaleAnim }] }]}>
        {renderIcon(isFocused ? activeColor : inactiveColor)}
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? activeColor : inactiveColor,
              fontWeight: isFocused ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {getLabel()}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const AppleGlassTabBar: React.FC<AppleGlassTabBarProps> = ({
  state,
  navigation,
}) => {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  // Lower the bottom position so it sits naturally above the iPhone home indicator
  const bottomPosition = insets.bottom > 0 ? Math.max(insets.bottom - 12, 10) : 12;

  const defaultWidth = Math.min(Dimensions.get('window').width * 0.82, 310);
  const [containerWidth, setContainerWidth] = useState(defaultWidth);

  const numTabs = state.routes.length || 3;
  const paddingHorizontal = 5;
  const availableWidth = Math.max(containerWidth - paddingHorizontal * 2, 0);
  const tabWidth = availableWidth / numTabs;

  const [slideAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.spring(slideAnim, {
        toValue: state.index * tabWidth,
        damping: 18,
        stiffness: 180,
        mass: 0.6,
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, tabWidth, slideAnim]);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: bottomPosition,
        },
      ]}
    >
      <View
        style={[
          styles.pillContainer,
          !isDark && {
            shadowColor: '#000000',
            shadowOpacity: 0.12,
            shadowRadius: 16,
          },
        ]}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width;
          if (width > 0 && Math.abs(width - containerWidth) > 1) {
            setContainerWidth(width);
          }
        }}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 90}
          tint={isDark ? 'dark' : 'light'}
          blurMethod="dimezisBlurView"
          style={[
            styles.blurBackdrop,
            !isDark && {
              backgroundColor: 'rgba(255, 255, 255, 0.88)',
              borderColor: 'rgba(0, 0, 0, 0.08)',
            },
          ]}
        >
          {/* Active Segment Pill */}
          <Animated.View
            style={[
              styles.slidingGlassIndicator,
              !isDark && {
                backgroundColor: 'rgba(79, 70, 229, 0.12)',
                borderColor: 'rgba(79, 70, 229, 0.18)',
                shadowOpacity: 0.08,
              },
              {
                width: tabWidth - 4,
                left: paddingHorizontal + 2,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          />

          {/* Tabs row */}
          <View style={[styles.tabsRow, { paddingHorizontal }]}>
            {state.routes.map((route: TabRoute, index: number) => {
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <TabItem
                  key={route.key}
                  route={route}
                  isFocused={isFocused}
                  isDark={isDark}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  pillContainer: {
    width: '82%',
    maxWidth: 310,
    borderRadius: 27,
    // Native Apple Ambient Drop Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  blurBackdrop: {
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 24, 34, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    justifyContent: 'center',
  },
  slidingGlassIndicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    // Evident Apple Segmented Indicator Shadow synced to iOS Settings
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: -0.2,
  },
});
