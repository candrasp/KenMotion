export interface StoryboardScene {
  scene: string;
  start: number;
  end: number;
  script: string;
  visual: string;
}

export interface ProjectInfo {
  id: string;
  hasStoryboard: boolean;
  hasHtml: boolean;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  size?: number;
}

export interface CheckFinding {
  type: 'overflow' | 'safe_area' | 'script_mismatch' | 'timing' | 'empty_scene' | 'font_error' | 'base64_found' | 'no_spec' | 'audio_issue';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

export interface GlobalFinding {
  type: CheckFinding['type'];
  severity: CheckFinding['severity'];
  message: string;
  affectedScenes: string[];
}

export interface SceneInspectionResult {
  scene: string;
  start: number;
  end: number;
  expectedScript: string;
  actualScript: string;
  findings: CheckFinding[];
}

export interface InspectionSummary {
  projectId: string;
  totalScenes: number;
  passedCount: number;
  issuesCount: number;
  globalFindings: GlobalFinding[];
  scenes: SceneInspectionResult[];
  fixPrompt: string;
}

export type RenderStatus = 'idle' | 'rendering' | 'mixing' | 'done' | 'cancelled' | 'error';

export interface AudioCue {
  scene: string;
  offset: number;
  file: string;
  volume: number;
  absoluteTime?: number;
  resolvedUrl?: string;
  resolvedFilePath?: string;
}

export interface AudioInspectionIssue {
  type: 'missing_file' | 'clipping' | 'overlap' | 'duration_mismatch';
  severity: 'error' | 'warning';
  message: string;
  details?: string;
}

export interface AudioManifest {
  hasNarasi: boolean;
  hasMusik: boolean;
  cues: AudioCue[];
  narasiUrl?: string;
  narasiFilePath?: string;
  musikUrl?: string;
  musikFilePath?: string;
  issues?: AudioInspectionIssue[];
}

export interface StyleOverride {
  scene: string;
  selector: string;
  style: Record<string, string>;
  text?: string;
  timeOffset?: number;
}

export interface RenderProgress {
  status: RenderStatus;
  frame: number;
  totalFrames: number;
  fps: number;
  outputPath?: string;
  error?: string;
}
