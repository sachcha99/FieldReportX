import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

function getToken() {
  const extra =
    Constants.expoConfig?.extra ??
    Constants.manifest2?.extra?.expoClient?.extra ??
    Constants.manifest?.extra ??
    {};
  return extra.GROQ_API_KEY || null;
}

export async function transcribeAudioUri(uri) {
  const token = getToken();

  if (!token) {
    return '[Speech transcription — add GROQ_API_KEY to app.json extra to enable]';
  }

  const result = await FileSystem.uploadAsync(
    'https://api.groq.com/openai/v1/audio/transcriptions',
    uri,
    {
      httpMethod: 'POST',
      uploadType: 1, // MULTIPART
      fieldName: 'file',
      mimeType: 'audio/m4a',
      parameters: {
        model: 'whisper-large-v3-turbo',
        language: 'en',
        response_format: 'json',
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (result.status !== 200) {
    let errMsg = result.body;
    try { errMsg = JSON.parse(result.body)?.error?.message ?? result.body; } catch {}
    throw new Error(`Transcription failed (${result.status}): ${errMsg}`);
  }

  const json = JSON.parse(result.body);
  return json.text ?? '';
}
