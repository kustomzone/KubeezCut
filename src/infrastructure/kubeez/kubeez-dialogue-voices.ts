export interface TextToDialogueVoice {
  id: string;
  label: string;
}

/**
 * Voices for Kubeez `POST /v1/generate/dialogue` (`voice` per line).
 * Values are ElevenLabs text-to-dialogue style: built-in names and voice_ids
 * (see Kie `elevenlabs/text-to-dialogue-v3` docs). Kept in-repo so CI does not
 * depend on a local `KubeezWebsite/` tree.
 */
export const TEXT_TO_DIALOGUE_VOICES: TextToDialogueVoice[] = [
  { id: 'Adam', label: 'Adam' },
  { id: 'Alice', label: 'Alice' },
  { id: 'Bill', label: 'Bill' },
  { id: 'Brian', label: 'Brian' },
  { id: 'Callum', label: 'Callum' },
  { id: 'Charlie', label: 'Charlie' },
  { id: 'Charlotte', label: 'Charlotte' },
  { id: 'Chris', label: 'Chris' },
  { id: 'Daniel', label: 'Daniel' },
  { id: 'Eric', label: 'Eric' },
  { id: 'George', label: 'George' },
  { id: 'Harry', label: 'Harry' },
  { id: 'Jessica', label: 'Jessica' },
  { id: 'Laura', label: 'Laura' },
  { id: 'Lily', label: 'Lily' },
  { id: 'Liam', label: 'Liam' },
  { id: 'Matilda', label: 'Matilda' },
  { id: 'River', label: 'River' },
  { id: 'Roger', label: 'Roger' },
  { id: 'Sarah', label: 'Sarah' },
  { id: 'Will', label: 'Will' },
  { id: 'BIvP0GN1cAtSRTxNHnWS', label: 'Ellen — Serious, direct' },
  { id: 'aMSt68OGf4xUZAnLpTU8', label: 'Juniper — Grounded' },
  { id: 'RILOU7YmBhvwJGDGjNmP', label: 'Jane — Professional' },
  { id: 'EkK5I93UQWFDigLMpZcX', label: 'James — Husky, engaging' },
  { id: 'tnSpp4vdxKPjI9w0GnoV', label: 'Hope — Upbeat, clear' },
];

export const DEFAULT_VOICE_ID = TEXT_TO_DIALOGUE_VOICES[0]!.id;
