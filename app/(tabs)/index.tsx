import React, { useState } from 'react';
import { ActivityIndicator, Platform, Modal } from 'react-native';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, SafeAreaView } from '../../components/tw';
import { Ionicons } from '@expo/vector-icons';
import { useLanguages } from '../../hooks/useLanguages';

const TranslatorPage = () => {
    const { languages, fetchState, source: langSource, refetch } = useLanguages('http://192.168.1.7:8000');

    const [sourceLang, setSourceLang] = useState('English');
    const [targetLang, setTargetLang] = useState('Spanish');
    const [sourceText, setSourceText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isTranslating, setIsTranslating] = useState(false);
    const [isLangModalVisible, setIsLangModalVisible] = useState(false);
    const [selectingFor, setSelectingFor] = useState<'source' | 'target'>('source');

    const isLoadingLanguages = fetchState === 'loading' || fetchState === 'idle';
    const isOfflineMode = langSource === 'static';

    const handleSwap = () => {
        setSourceLang(targetLang);
        setTargetLang(sourceLang);
        setSourceText(translatedText);
        setTranslatedText(sourceText);
    };

    const ML_BASE_URL = 'http://192.168.1.7:8000';

    const handleTranslate = async () => {
        if (!sourceText.trim()) return;

        setIsTranslating(true);
        try {
            const response = await fetch(`${ML_BASE_URL}/ml/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source_text: sourceText,
                    source_lang: sourceLang,
                    target_lang: targetLang
                }),
            });

            if (!response.ok) {
                const errBody = await response.text();
                let detail = errBody;
                try {
                    const parsed = JSON.parse(errBody);
                    detail = parsed.detail || errBody;
                } catch {}

                if (response.status === 503) {
                    if (detail.includes('model not available')) {
                        setTranslatedText('[Unavailable]: Translation model not installed for this language pair.\n\nOnly English ↔ Spanish is currently available.');
                    } else {
                        setTranslatedText('[Loading]: The translation engine is still preparing language models.\n\nPlease wait a moment and try again.');
                    }
                    return;
                }
                throw new Error(detail);
            }

            const data = await response.json();
            setTranslatedText(data.translated_text);
        } catch (error: unknown) {
            const err = error as Error;
            console.error(err);
            if (err.message?.includes('Network request failed') || err.message?.includes('Failed to fetch')) {
                setTranslatedText('[Network Error]: Can\'t reach the ML service.\n\nMake sure:\n1. Docker is running\n2. ml-service container is up\n3. Your phone and PC are on the same WiFi');
            } else {
                setTranslatedText(`[Error]: ${err.message}`);
            }
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-neutral-950">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView contentContainerClassName="flex-grow p-4">
                    {/* Header */}
                    <View className="mb-6 mt-2">
                        <Text className="text-3xl font-extrabold text-white">Glossa</Text>
                        <Text className="text-neutral-400 mt-1">AI-Powered Translation</Text>
                    </View>

                    {/* Offline Indicator */}
                    {isOfflineMode && (
                        <View className="flex-row items-center bg-amber-900/30 rounded-xl px-4 py-2 mb-4 border border-amber-800/50">
                            <Ionicons name="cloud-offline-outline" size={16} color="#D97706" />
                            <Text className="text-amber-400 ml-2 text-sm">
                                Using offline language list
                            </Text>
                            <TouchableOpacity
                                onPress={refetch}
                                className="ml-auto flex-row items-center"
                            >
                                <Ionicons name="refresh" size={14} color="#D97706" />
                                <Text className="text-amber-400 ml-1 text-sm">Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Language Selector */}
                    <View className="flex-row items-center justify-between bg-neutral-900 rounded-2xl p-2 mb-4 border border-neutral-800 shadow-sm">
                        <TouchableOpacity
                            className="flex-1 items-center py-3"
                            onPress={() => { setSelectingFor('source'); setIsLangModalVisible(true); }}
                            disabled={isLoadingLanguages}
                        >
                            {isLoadingLanguages ? (
                                <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                                <Text className="text-white font-semibold text-lg">{sourceLang}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSwap}
                            className="bg-indigo-600 w-12 h-12 rounded-full items-center justify-center shadow-lg"
                        >
                            <Ionicons name="swap-horizontal" size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 items-center py-3"
                            onPress={() => { setSelectingFor('target'); setIsLangModalVisible(true); }}
                            disabled={isLoadingLanguages}
                        >
                            {isLoadingLanguages ? (
                                <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                                <Text className="text-white font-semibold text-lg">{targetLang}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Source Text Input */}
                    <View className="bg-neutral-900 rounded-2xl p-4 mb-4 border border-neutral-800 h-48 relative shadow-sm">
                        <TextInput
                            style={{ color: 'white', fontSize: 20, flex: 1, textAlign: 'left', textAlignVertical: 'top', height: '100%' }}
                            placeholder="Type here to translate..."
                            placeholderTextColor="#737373"
                            multiline
                            value={sourceText}
                            onChangeText={setSourceText}
                        />
                        {sourceText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => setSourceText('')}
                                className="absolute top-4 right-4 bg-neutral-800 rounded-full p-1"
                            >
                                <Ionicons name="close" size={16} color="#A3A3A3" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Translate Button */}
                    <TouchableOpacity
                        onPress={handleTranslate}
                        disabled={isTranslating || !sourceText.trim()}
                        className={`py-4 rounded-xl items-center justify-center mb-6 shadow-md ${
                            isTranslating || !sourceText.trim()
                                ? 'bg-indigo-900/50'
                                : 'bg-indigo-600'
                        }`}
                    >
                        {isTranslating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg tracking-wide">Translate</Text>
                        )}
                    </TouchableOpacity>

                    {/* Translated Text Output */}
                    <View className="bg-indigo-950/30 rounded-2xl p-4 border border-indigo-900/50 min-h-32">
                        <Text className="text-indigo-400 font-medium mb-2 text-xs uppercase tracking-wider">
                            {targetLang} Translation
                        </Text>
                        <Text className="text-white text-2xl font-light leading-9">
                            {translatedText || 'Translation will appear here...'}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Language Selection Modal */}
            <Modal
                visible={isLangModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsLangModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-black/70">
                    <View className="bg-neutral-900 rounded-t-3xl h-2/3 border-t border-neutral-800">
                        <View className="flex-row justify-between items-center p-5 border-b border-neutral-800">
                            <Text className="text-white text-xl font-bold">
                                Select {selectingFor === 'source' ? 'Source' : 'Target'} Language
                            </Text>
                            <TouchableOpacity onPress={() => setIsLangModalVisible(false)}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="p-4">
                            {languages.map((lang) => (
                                <TouchableOpacity
                                    key={lang}
                                    className="py-4 border-b border-neutral-800/50"
                                    onPress={() => {
                                        if (selectingFor === 'source') setSourceLang(lang);
                                        else setTargetLang(lang);
                                        setIsLangModalVisible(false);
                                    }}
                                >
                                    <Text className={`text-lg ${
                                        (selectingFor === 'source' ? sourceLang : targetLang) === lang
                                            ? 'text-indigo-400 font-bold'
                                            : 'text-white'
                                    }`}>
                                        {lang}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                            <View className="h-10" />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default TranslatorPage;
