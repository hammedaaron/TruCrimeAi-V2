export interface AppSettings {
  researchDepth: 'standard' | 'deep' | 'exhaustive';
  scriptComplexity: 'simple' | 'balanced' | 'complex';
  promptDetail: 'low' | 'medium' | 'high';
}

export interface SEOData {
  title: string;
  shortDescription: string;
  longDescription?: string;
  tags: string[];
}

export interface ContentStyle {
  id?: string;
  uid: string;
  name: string;
  prompt: string;
  isDefault?: boolean;
  createdAt: any;
}

export interface VisualPreset {
  id?: string;
  uid: string;
  name: string;
  prompt: string;
  isActive: boolean;
  createdAt: any;
}

export interface UserPreferences {
  uid: string;
  visualStorytellingRules: string; // Legacy field
  activeVisualPresetId?: string;
  updatedAt: any;
}

export interface Generation {
  id?: string;
  uid: string;
  topic: string;
  scriptStyle: ScriptStyle | string; // Allow custom style names
  imageryStyle: ImageryStyle;
  research: ResearchResult;
  script: string;
  extendedScript?: string;
  imagePrompts: ImagePrompt[];
  extendedImagePrompts?: ImagePrompt[];
  characterReferenceUrl?: string;
  characterDescription?: string;
  seo?: SEOData;
  createdAt: any; // Firestore Timestamp
}

export type ScriptStyle = 'journalist' | 'narrator' | 'storytelling' | 'incident reporting' | 'newsroom' | 'custom' | (string & {});
export type ImageryStyle = 'anime' | '3d' | 'realistic';

export interface CaseSummary {
  suspectName: string;
  crime: string;
  year: number;
  continent?: string;
  location?: string;
}

export interface ResearchResult {
  suspectName: string;
  whoTheyWere: string;
  whatHappened: string;
  howTheyEndedUpThere: string;
  keyFacts: string[];
  sources: { title: string; uri: string }[];
}

export interface ImagePrompt {
  sceneNumber: number;
  imagePrompt: string;
  animationPrompt: string;
  scriptLine: string;
  generatedImageUrl?: string;
}

export interface GenerationResponse {
  research: ResearchResult;
  script: string;
  extendedScript?: string;
  imagePrompts: ImagePrompt[];
  extendedImagePrompts?: ImagePrompt[];
  characterReferenceUrl?: string;
  characterDescription?: string;
  seo?: SEOData;
}
