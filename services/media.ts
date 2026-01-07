/**
 * Extracts audio from a video file and returns it as a base64 string (WAV format) and the raw AudioBuffer.
 */
export const extractAudioFromVideo = async (videoFile: File): Promise<{ base64Audio: string, audioBuffer: AudioBuffer }> => {
  const arrayBuffer = await videoFile.arrayBuffer();
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextClass();
  
  // Decode the audio data from the video file
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Convert AudioBuffer to WAV blob
  const wavBlob = await audioBufferToWav(audioBuffer);
  
  // Convert Blob to Base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve({ base64Audio: base64String, audioBuffer });
    };
    reader.onerror = reject;
    reader.readAsDataURL(wavBlob);
  });
};

/**
 * Generates a normalized array of peaks from an AudioBuffer for visualization.
 */
export const getWaveformData = (audioBuffer: AudioBuffer, samples: number): number[] => {
  const rawData = audioBuffer.getChannelData(0); // Left channel
  const blockSize = Math.floor(rawData.length / samples);
  const filteredData = [];
  for (let i = 0; i < samples; i++) {
    let blockStart = i * blockSize;
    let sum = 0;
    for (let j = 0; j < blockSize; j++) {
      sum = sum + Math.abs(rawData[blockStart + j]);
    }
    filteredData.push(sum / blockSize);
  }
  // Normalize
  const multiplier = Math.pow(Math.max(...filteredData), -1);
  return filteredData.map(n => n * multiplier);
};

// Helper to convert AudioBuffer to WAV
// Source: https://github.com/jamessoubry/audiobuffer-to-wav (Simplified)
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this example)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++)
    channels.push(buffer.getChannelData(i));

  while (pos < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([bufferArray], { type: 'audio/wav' });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};