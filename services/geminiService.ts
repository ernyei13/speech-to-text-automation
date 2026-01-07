import { GoogleGenAI, Type } from "@google/genai";
import { SubtitleChunk } from "../types";

const MODEL_NAME = "gemini-3-flash-preview"; 

export const transcribeAudio = async (base64Audio: string): Promise<SubtitleChunk[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Transcribe the following audio for use in a fast-paced social media video.
    Split the transcription into short, punchy segments (approx 1-3 words max per segment).
    
    CRITICAL INSTRUCTIONS FOR TIMING:
    1. Timestamps must be extremely precise to the millisecond of the spoken utterance.
    2. Do NOT include silence before or after the word in the start/end times.
    3. Ensure no overlap between segments.
    4. If there is a pause, leave a gap in the timeline.

    Return a JSON array where each object has:
    - "text": The text content.
    - "start": Start time in seconds (number).
    - "end": End time in seconds (number).
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav",
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              start: { type: Type.NUMBER },
              end: { type: Type.NUMBER }
            },
            required: ["text", "start", "end"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const rawData = JSON.parse(jsonText);
    
    // Add unique IDs
    return rawData.map((item: any, index: number) => ({
      id: `sub-${index}-${Date.now()}`,
      text: item.text,
      start: item.start,
      end: item.end
    }));

  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};