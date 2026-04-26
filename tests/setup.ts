jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (component: unknown) => component,
    View: 'Animated.View',
    Text: 'Animated.Text',
    ScrollView: 'Animated.ScrollView',
    FlatList: 'Animated.FlatList',
    Image: 'Animated.Image',
  },
  useSharedValue: (val: unknown) => ({ value: val }),
  useAnimatedStyle: () => ({}),
  useAnimatedScrollHandler: () => ({}),
  withTiming: (val: unknown) => val,
  withSpring: (val: unknown) => val,
  Easing: {
    bezier: () => 0,
    linear: () => 0,
  },
  runOnJS: (fn: unknown) => fn,
  runOnUI: (fn: unknown) => fn,
}));

jest.mock('react-native-worklets', () => ({}));
