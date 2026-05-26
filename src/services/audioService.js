import { Audio } from 'expo-av';

let recording = null;

export async function requestAudioPermission() {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

export async function startRecording() {
  const granted = await requestAudioPermission();
  if (!granted) throw new Error('Microphone permission denied');

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  recording = rec;
  return recording;
}

export async function stopRecording() {
  if (!recording) return null;
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  return uri;
}

export async function playAudio(uri) {
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.didJustFinish) sound.unloadAsync();
  });
  return sound;
}

export function isRecording() {
  return recording !== null;
}
