import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, View } from 'react-native';
import { Mic, MicOff } from 'lucide-react-native';
import { startRecording, stopRecording } from '../services/audioService';
import { transcribeAudioUri } from '../services/speechToTextService';
import { spacing, radius } from '../theme/tokens';

// onTranscript(text, audioUri) — called when transcription completes
// onAudioSaved(audioUri) — called when raw audio is saved (independent of transcription)
// accentColor — theme colour for the button
export default function SpeechToTextButton({ onTranscript, onAudioSaved, accentColor = '#2563EB', style }) {
  const [state, setState] = useState('idle'); // idle | recording | transcribing

  const handlePress = async () => {
    if (state === 'idle') {
      try {
        setState('recording');
        await startRecording();
      } catch (err) {
        setState('idle');
        Alert.alert('Microphone Error', err.message);
      }
      return;
    }

    if (state === 'recording') {
      try {
        setState('transcribing');
        const uri = await stopRecording();
        if (uri && onAudioSaved) onAudioSaved(uri);
        if (uri) {
          const transcript = await transcribeAudioUri(uri);
          if (onTranscript) onTranscript(transcript, uri);
        }
      } catch (err) {
        Alert.alert('Transcription Error', err.message);
      } finally {
        setState('idle');
      }
    }
  };

  const isRecording = state === 'recording';
  const isTranscribing = state === 'transcribing';

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: isRecording ? '#ef4444' : accentColor }, style]}
      onPress={handlePress}
      disabled={isTranscribing}
      activeOpacity={0.75}
    >
      {isTranscribing ? (
        <>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.label}>Transcribing…</Text>
        </>
      ) : isRecording ? (
        <>
          <MicOff size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.label}>Stop & Transcribe</Text>
          <View style={styles.pulse} />
        </>
      ) : (
        <>
          <Mic size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.label}>Record & Transcribe</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  label: { color: '#fff', fontWeight: '600', fontSize: 13 },
  pulse: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff', opacity: 0.7,
  },
});
