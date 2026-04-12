/**
 * Kubeez Text-to-Dialogue V3 voices (ElevenLabs).
 * Full list sourced from KubeezWebsite — includes all 100+ voices with categories.
 */

export type VoiceCategory =
  | 'Conversational'
  | 'Narration'
  | 'Characters'
  | 'Social Media'
  | 'Educational'
  | 'Entertainment'
  | 'Advertisement';

export interface TextToDialogueVoice {
  id: string;
  label: string;
  category?: VoiceCategory;
}

const FEMALE_NAMES = new Set([
  'Alice', 'Jessica', 'Laura', 'Lily', 'Matilda', 'Sarah', 'Ellen', 'Juniper', 'Jane', 'Arabella',
  'Hope', 'Adeline', 'Eve', 'Anika', 'Priyanka', 'Monika', 'Charlotte', 'Heather', 'Brittney', 'Bella',
  'Lucy', 'Tiffany', 'Cassidy', 'Addison', 'Emma', 'Aria', 'Amelia', 'Olivia', 'Angela', 'Rachel',
  'Britney', 'Natasha', 'Emily', 'Clara', 'Allison', 'Jean', 'Blondie', 'Koraly', 'AImee', 'Guadeloupe',
  'Flicker', 'Ana Rita',
]);

export function getVoiceGender(voice: TextToDialogueVoice): 'female' | 'male' {
  const name = voice.label.split(' - ')[0]?.trim() || voice.label.split(/\s/)[0] || '';
  return FEMALE_NAMES.has(name) ? 'female' : 'male';
}

export const TEXT_TO_DIALOGUE_VOICES: TextToDialogueVoice[] = [
  // ── Conversational ──
  { id: 'Adam', label: 'Adam - Dominant, Firm', category: 'Social Media' },
  { id: 'Alice', label: 'Alice', category: 'Conversational' },
  { id: 'Bill', label: 'Bill', category: 'Conversational' },
  { id: 'Brian', label: 'Brian - Deep, Resonant and Comforting', category: 'Social Media' },
  { id: 'Callum', label: 'Callum - Husky Trickster', category: 'Characters' },
  { id: 'Charlie', label: 'Charlie', category: 'Conversational' },
  { id: 'Chris', label: 'Chris - Charming, Down-to-Earth', category: 'Conversational' },
  { id: 'Daniel', label: 'Daniel', category: 'Conversational' },
  { id: 'Eric', label: 'Eric', category: 'Conversational' },
  { id: 'George', label: 'George', category: 'Conversational' },
  { id: 'Harry', label: 'Harry - Fierce Warrior', category: 'Characters' },
  { id: 'Jessica', label: 'Jessica - Playful, Bright, Warm', category: 'Conversational' },
  { id: 'Laura', label: 'Laura - Enthusiast, Quirky Attitude', category: 'Social Media' },
  { id: 'Liam', label: 'Liam - Energetic, Social Media Creator', category: 'Social Media' },
  { id: 'Lily', label: 'Lily', category: 'Conversational' },
  { id: 'Matilda', label: 'Matilda', category: 'Conversational' },
  { id: 'River', label: 'River', category: 'Conversational' },
  { id: 'Roger', label: 'Roger', category: 'Conversational' },
  { id: 'Sarah', label: 'Sarah', category: 'Conversational' },
  { id: 'Will', label: 'Will', category: 'Conversational' },

  // ── Featured / Best ──
  { id: 'BIvP0GN1cAtSRTxNHnWS', label: 'Ellen - Serious, Direct and Confident', category: 'Conversational' },
  { id: 'aMSt68OGf4xUZAnLpTU8', label: 'Juniper - Grounded and Professional', category: 'Conversational' },
  { id: 'RILOU7YmBhvwJGDGjNmP', label: 'Jane - Professional Audiobook Reader', category: 'Narration' },
  { id: 'EkK5I93UQWFDigLMpZcX', label: 'James - Husky, Engaging and Bold', category: 'Narration' },
  { id: 'Z3R5wn05IrDiVCyEkUrK', label: 'Arabella - Mysterious and Emotive', category: 'Narration' },
  { id: 'tnSpp4vdxKPjI9w0GnoV', label: 'Hope - Upbeat and Clear', category: 'Social Media' },
  { id: 'NNl6r8mD7vthiJatiJt1', label: 'Bradford - Expressive and Articulate', category: 'Narration' },
  { id: 'YOq2y2Up4RgXP2HyXjE5', label: 'Xavier - Dominating, Metallic Announcer', category: 'Characters' },
  { id: 'Bj9UqZbhQsanLzgalpEG', label: 'Austin - Deep, Raspy and Authentic', category: 'Characters' },
  { id: 'c6SfcYrb2t09NHXiT80T', label: 'Jarnathan - Confident and Versatile', category: 'Conversational' },
  { id: 'B8gJV1IhpuegLxdpXFOE', label: 'Kuon - Cheerful, Clear and Steady', category: 'Characters' },
  { id: 'exsUS4vynmxd379XN4yO', label: 'Blondie - Conversational', category: 'Conversational' },
  { id: 'BpjGufoPiobT79j2vtj4', label: 'Priyanka - Calm, Neutral and Relaxed', category: 'Narration' },
  { id: '2zRM7PkgwBPiau2jvVXc', label: 'Monika Sogam - Deep and Natural', category: 'Social Media' },
  { id: '1SM7GgM6IMuvQlz2BwM3', label: 'Mark - Casual, Relaxed and Light', category: 'Conversational' },
  { id: 'ouL9IsyrSnUkCmfnD02u', label: 'Grimblewood Thornwhisker - Snarky Gnome', category: 'Characters' },
  { id: '5l5f8iK3YPeGga21rQIX', label: 'Adeline - Feminine and Conversational', category: 'Narration' },
  { id: 'scOwDtmlUjD3prqpp97I', label: 'Sam - Support Agent', category: 'Conversational' },
  { id: 'NOpBlnGInO9m6vDvFkFC', label: 'Spuds Oxley - Wise and Approachable', category: 'Conversational' },
  { id: 'BZgkqPqms7Kj9ulSkVzn', label: 'Eve - Authentic, Energetic and Happy', category: 'Conversational' },
  { id: 'wo6udizrrtpIxWGp2qJk', label: 'Northern Terry', category: 'Characters' },
  { id: 'yjJ45q8TVCrtMhEKurxY', label: 'Dr. Von - Quirky, Mad Scientist', category: 'Characters' },
  { id: 'gU0LNdkMOQCOrPrwtbee', label: 'British Football Announcer', category: 'Characters' },
  { id: 'DGzg6RaUqxGRTHSBjfgF', label: 'Brock - Commanding and Loud Sergeant', category: 'Characters' },
  { id: 'DGTOOUoGpoP6UZ9uSWfA', label: 'Célian - Documentary Narrator', category: 'Narration' },
  { id: 'x70vRnQBMBu4FAYhjJbO', label: 'Nathan - Virtual Radio Host', category: 'Narration' },
  { id: 'Sm1seazb4gs7RSlUVw7c', label: 'Anika - Animated, Friendly and Engaging', category: 'Characters' },
  { id: 'P1bg08DkjqiVEzOn76yG', label: 'Viraj - Rich and Soft', category: 'Narration' },
  { id: 'qDuRKMlYmrm8trt5QyBn', label: 'Taksh - Calm, Serious and Smooth', category: 'Narration' },
  { id: 'kUUTqKQ05NMGulF08DDf', label: 'Guadeloupe Merryweather - Emotional', category: 'Characters' },
  { id: 'qXpMhyvQqiRxWQs4qSSB', label: 'Horatius - Energetic Character Voice', category: 'Characters' },

  // ── Voice-ID variants (ElevenLabs IDs for named voices) ──
  { id: 'TX3LPaxmHKxFdv7VOQHJ', label: 'Liam - Energetic, Social Media Creator', category: 'Social Media' },
  { id: 'iP95p4xoKVk53GoZ742B', label: 'Chris - Charming, Down-to-Earth', category: 'Conversational' },
  { id: 'SOYHLrjzK2X1ezoPC6cr', label: 'Harry - Fierce Warrior', category: 'Characters' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', label: 'Callum - Husky Trickster', category: 'Characters' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', label: 'Laura - Enthusiast, Quirky Attitude', category: 'Social Media' },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte', category: 'Characters' },
  { id: 'cgSgspJ2msm6clMCkdW9', label: 'Jessica - Playful, Bright, Warm', category: 'Conversational' },

  // ── Popular TikTok / Social Media ──
  { id: 'MnUw1cSnpiLoLhpd3Hqp', label: 'Heather Rey - Rushed and Friendly', category: 'Conversational' },
  { id: 'kPzsL2i3teMYv0FxEYQ6', label: 'Brittney - Fun, Youthful & Informative', category: 'Social Media' },
  { id: 'UgBBYS2sOqTuMpoF3BR0', label: 'Mark - Natural Conversations', category: 'Conversational' },
  { id: 'IjnA9kwZJHJ20Fp7Vmy6', label: 'Matthew - Casual, Friendly and Smooth', category: 'Conversational' },
  { id: 'KoQQbl9zjAdLgKZjm8Ol', label: 'Pro Narrator - Convincing Story Teller', category: 'Narration' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', label: 'Bella - Professional, Bright, Warm', category: 'Educational' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam - Dominant, Firm', category: 'Social Media' },
  { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian - Deep, Resonant and Comforting', category: 'Social Media' },

  // ── Studio Conversational ──
  { id: 'L0Dsvb3SLTyegXwtm47J', label: 'Archer', category: 'Conversational' },
  { id: 'uYXf8XasLslADfZ2MB4u', label: 'Hope - Bubbly, Gossipy and Girly', category: 'Conversational' },
  { id: 'gs0tAILXbY5DNrJrsM6F', label: 'Jeff - Classy, Resonating and Strong', category: 'Conversational' },
  { id: 'DTKMou8ccj1ZaWGBiotd', label: 'Jamahal - Young, Vibrant and Natural', category: 'Conversational' },
  { id: 'vBKc2FfBKJfcZNyEt1n6', label: 'Finn - Youthful, Eager and Energetic', category: 'Conversational' },
  { id: 'TmNe0cCqkZBMwPWOd3RD', label: 'Smith - Mellow, Spontaneous and Bassy', category: 'Narration' },
  { id: 'DYkrAHD8iwork3YSUBbs', label: 'Tom - Conversations & Books', category: 'Conversational' },
  { id: '56AoDkrOh6qfVPDXZ7Pt', label: 'Cassidy - Crisp, Direct and Clear', category: 'Conversational' },
  { id: 'eR40ATw9ArzDf9h3v7t7', label: 'Addison 2.0 - Australian Audiobook & Podcast', category: 'Narration' },
  { id: 'g6xIsTj2HwM6VR4iXFCw', label: 'Jessica Anne Bogart - Chatty and Friendly', category: 'Conversational' },
  { id: 'lcMyyd2HUfFzxdCaC4Ta', label: 'Lucy - Fresh & Casual', category: 'Conversational' },
  { id: '6aDn1KB0hjpdcocrUkmq', label: 'Tiffany - Natural and Welcoming', category: 'Conversational' },
  { id: 'Sq93GQT4X1lKDXsQcixO', label: 'Felix - Warm, Positive & Contemporary RP', category: 'Conversational' },

  // ── Characters ──
  { id: 'vfaqCOvlrKi4Zp7C2IAm', label: 'Malyx - Echoey, Menacing Deep Demon', category: 'Characters' },
  { id: 'piI8Kku0DcvcL6TTSeQt', label: 'Flicker - Cheerful Fairy & Sparkly Sweetness', category: 'Characters' },
  { id: 'KTPVrSVAEUSJRClDzBw7', label: 'Bob - Rugged and Warm Cowboy', category: 'Characters' },
  { id: 'flHkNRp1BlvT73UL6gyz', label: 'Jessica Anne Bogart - Eloquent Villain', category: 'Characters' },
  { id: '9yzdeviXkFddZ4Oz8Mok', label: 'Lutz - Chuckling, Giggly and Cheerful', category: 'Characters' },
  { id: 'pPdl9cQBQq4p6mRkZy2Z', label: 'Emma - Adorable and Upbeat', category: 'Characters' },
  { id: '0SpgpJ4D3MpHCiWdyTg3', label: 'Matthew Schmitz - Elitist, Arrogant Tyrant', category: 'Characters' },
  { id: 'UFO0Yv86wqRxAt1DmXUu', label: 'Sarcastic and Sultry Villain', category: 'Characters' },
  { id: 'oR4uRy4fHDUGGISL0Rev', label: 'Myrrdin - Wise and Magical Narrator', category: 'Characters' },
  { id: 'zYcjlYFOd3taleS0gkk3', label: 'Edward - Loud, Confident and Cocky', category: 'Characters' },
  { id: 'nzeAacJi50IvxcyDnMXa', label: 'Marshal - Friendly, Funny Professor', category: 'Characters' },
  { id: 'ruirxsoakN0GWmGNIo04', label: 'John Morgan - Gritty, Rugged Cowboy', category: 'Characters' },
  { id: '1KFdM0QCwQn4rmn5nn9C', label: 'Parasyte - Whispers from the Deep Dark', category: 'Characters' },
  { id: 'TC0Zp7WVFzhA8zpTlRqV', label: 'Aria - Sultry Villain', category: 'Characters' },
  { id: 'ljo9gAlSqKOvF6D8sOsX', label: 'Viking Bjorn - Epic Medieval Raider', category: 'Characters' },
  { id: 'PPzYpIqttlTYA83688JI', label: 'Pirate Marshal', category: 'Characters' },

  // ── Stories / Narration ──
  { id: 'ZF6FPAbjXT4488VcRRnw', label: 'Amelia - Enthusiastic and Expressive', category: 'Narration' },
  { id: '8JVbfL6oEdmuxKn5DK2C', label: 'Johnny Kid - Serious and Calm Narrator', category: 'Narration' },
  { id: 'iCrDUkL56s3C8sCRl7wb', label: 'Hope - Poetic, Romantic and Captivating', category: 'Narration' },
  { id: '1hlpeD1ydbI2ow0Tt3EW', label: 'Olivia - Smooth, Warm and Engaging', category: 'Narration' },
  { id: 'wJqPPQ618aTW29mptyoc', label: 'Ana Rita - Smooth, Expressive and Bright', category: 'Narration' },
  { id: 'EiNlNiXeDU1pqqOPrYMO', label: 'John Doe - Deep', category: 'Narration' },
  { id: 'FUfBrNit0NNZAwb58KWH', label: 'Angela - Conversational and Friendly', category: 'Conversational' },

  // ── Burt Reynolds / Western ──
  { id: '4YYIPFl9wE5c4L2eu2Gb', label: 'Burt Reynolds\u2122 - Deep, Smooth and Clear', category: 'Narration' },
  { id: 'OYWwCdDHouzDwiZJWOOu', label: 'David - Gruff Cowboy', category: 'Narration' },
  { id: '6F5Zhi321D3Oq7v1oNT4', label: 'Hank - Deep and Engaging Narrator', category: 'Entertainment' },
  { id: 'qNkzaJoHLLdpvgh5tISm', label: 'Carter - Rich, Smooth and Rugged', category: 'Characters' },
  { id: 'YXpFCvM1S3JbWEJhoskW', label: 'Wyatt - Wise Rustic Cowboy', category: 'Narration' },
  { id: '9PVP7ENhDskL0KYHAKtD', label: 'Jerry B. - Southern/Cowboy', category: 'Narration' },

  // ── Announcers / Radio ──
  { id: 'LG95yZDEHg6fCZdQjLqj', label: 'Phil - Explosive, Passionate Announcer', category: 'Characters' },
  { id: 'CeNX9CMwmxDxUF5Q2Inm', label: 'Johnny Dynamite - Vintage Radio DJ', category: 'Characters' },
  { id: 'st7NwhTPEzqo2riw7qWC', label: 'Blondie - Radio Host', category: 'Entertainment' },
  { id: 'aD6riP1btT197c6dACmy', label: 'Rachel M - Pro British Radio Presenter', category: 'Entertainment' },
  { id: 'FF7KdobWPaiR0vkcALHF', label: 'David - Movie Trailer Narrator', category: 'Entertainment' },
  { id: 'mtrellq69YZsNwzUSyXh', label: 'Rex Thunder - Deep N Tough', category: 'Advertisement' },
  { id: 'dHd5gvgSOzSfduK4CvEg', label: 'Ed - Late Night Announcer', category: 'Characters' },
  { id: 'cTNP6ZM2mLTKj2BFhxEh', label: 'Paul French - Podcaster', category: 'Entertainment' },

  // ── Epic / Dramatic ──
  { id: 'eVItLK1UvXctxuaRV2Oq', label: 'Jean - Alluring and Playful Femme Fatale', category: 'Characters' },
  { id: 'U1Vk2oyatMdYs096Ety7', label: 'Michael - Deep, Dark and Urban', category: 'Social Media' },
  { id: 'esy0r39YPLQjOczyOib8', label: 'Britney - Calm and Calculative Villain', category: 'Characters' },
  { id: 'bwCXcoVxWNYMlC6Esa8u', label: 'Matthew Schmitz - Gravel, Deep Anti-Hero', category: 'Characters' },
  { id: 'D2jw4N9m4xePLTQ3IHjU', label: 'Ian - Strange and Distorted Alien', category: 'Characters' },
  { id: 'Tsns2HvNFKfGiNjllgqo', label: 'Sven - Emotional and Nice', category: 'Advertisement' },

  // ── Relaxing / Meditation ──
  { id: 'Atp5cNFg1Wj5gyKD7HWV', label: 'Natasha - Gentle Meditation', category: 'Narration' },
  { id: '1cxc5c3E9K6F1wlqOJGV', label: 'Emily - Gentle, Soft and Meditative', category: 'Narration' },
  { id: '1U02n4nD6AdIZ9CjF053', label: 'Viraj - Smooth and Gentle', category: 'Narration' },
  { id: 'HgyIHe81F3nXywNwkraY', label: 'Nate - Sultry, Whispery and Seductive', category: 'Conversational' },
  { id: 'AeRdCCKzvd23BpJoofzx', label: 'Nathaniel - Engaging, British and Calm', category: 'Narration' },
  { id: 'LruHrtVF6PSyGItzMNHS', label: 'Benjamin - Deep, Warm, Calming', category: 'Narration' },
  { id: 'Qggl4b0xRMiqOwhPtVWT', label: 'Clara - Relaxing, Calm and Soothing', category: 'Narration' },
  { id: 'zA6D7RyKdc2EClouEMkP', label: 'AImee - Tranquil ASMR and Meditation', category: 'Social Media' },
  { id: '1wGbFxmAM3Fgw63G1zZJ', label: 'Allison - Calm, Soothing and Meditative', category: 'Entertainment' },
  { id: 'hqfrgApggtO1785R4Fsn', label: 'Theodore HQ - Serene and Grounded', category: 'Conversational' },
  { id: 'sH0WdfE5fsKuM2otdQZr', label: 'Koraly - Soft-spoken and Gentle', category: 'Conversational' },
  { id: 'MJ0RnG71ty4LH3dvNfSd', label: 'Leon - Soothing and Grounded', category: 'Educational' },
];

export const DEFAULT_VOICE_ID = TEXT_TO_DIALOGUE_VOICES[0]!.id;

const voiceById = new Map(TEXT_TO_DIALOGUE_VOICES.map((v) => [v.id, v]));

export function getVoiceById(id: string): TextToDialogueVoice | undefined {
  return voiceById.get(id);
}
