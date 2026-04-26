import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, useColorScheme } from 'react-native';

const bgColor =
    Platform.OS === 'ios'
        ? require('react-native').DynamicColorIOS({
            dark: 'rgba(10,10,10,0.92)',
            light: 'rgba(255,255,255,0.92)',
        })
        : undefined;

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const tintColor =
        Platform.OS === 'ios'
            ? require('react-native').DynamicColorIOS({
                dark: 'white',
                light: 'black',
            })
            : isDark
                ? '#FFFFFF'
                : '#000000';
    const labelColor =
        Platform.OS === 'ios'
            ? require('react-native').DynamicColorIOS({
                dark: 'white',
                light: 'black',
            })
            : isDark
                ? '#FFFFFF'
                : '#000000';

    const tabBarBackgroundColor =
        Platform.OS === 'android'
            ? isDark
                ? 'rgba(10,10,10,0.92)'
                : 'rgba(255,255,255,0.92)'
            : bgColor;

    return (
        <NativeTabs
            tintColor={tintColor}
            labelStyle={{ color: labelColor }}
            backgroundColor={tabBarBackgroundColor}
            blurEffect="none"
        >
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Label>Translator</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
            </NativeTabs.Trigger>

      //

            <NativeTabs.Trigger name="Learn">
                <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="book.fill" md="book" />
            </NativeTabs.Trigger>

      //

            <NativeTabs.Trigger name="profile">
                <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
