export type ColorTheme = 'green' | 'amber' | 'blue' | 'white';

export type Direction = '동' | '서' | '남' | '북';

export interface QuestionChoice {
  key: string;
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface GameStep {
  id: string;
  stageId: number;
  stageName: string;
  conceptCategory: '개념기초' | '아날로그_특성' | '아날로그_취약성' | '디지털_특성' | '디지털_복원력' | '종합응용';
  title: string;
  story: string[];
  asciiArt?: string[];
  type: 'choice' | 'text';
  choices?: QuestionChoice[];
  correctAnswerKeywords?: string[];
  explanationOnCorrect: string[];
  hint: string;
}

export interface RPGStats {
  level: number;
  hp: number;
  maxHp: number;
  attack: number;
  exp: number;
  maxExp: number;
  locationId: string;
  inventory: string[];
}

export interface RPGMonster {
  id: string;
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  attack: number;
  expReward: number;
  itemReward?: string;
  asciiArt: string[];
  dialogue: string;
  questionId?: string;
  questionText: string;
  choices: { key: string; text: string; isCorrect: boolean; explanation: string }[];
  defeated: boolean;
}

export interface RPGLocation {
  id: string;
  name: string;
  description: string;
  asciiArt: string[];
  exits: { [dir in Direction]?: string };
  monsterId?: string;
  clue?: string;
  isSanctuary?: boolean;
}

export interface LearningLogEntry {
  id: string;
  timestamp: string;
  studentId: string;
  stage: string;
  stageName: string;
  questionId: string;
  conceptCategory: string;
  userInput: string;
  isCorrect: boolean;
  timeSpentSec: number;
  attemptCount: number;
  playerHpAfter?: number;
  playerExpAfter?: number;
  playerLevelAfter?: number;
}

export interface StudentSession {
  studentId: string;
  startedAt: string;
  completedAt?: string;
  score: number;
  totalAttempts: number;
  correctCount: number;
  currentStageIndex: number;
  currentStepIndex: number;
  analogScore: number;
  analogTotal: number;
  digitalScore: number;
  digitalTotal: number;
  stats: RPGStats;
  clearedMonsters: string[];
  visitedLocations: string[];
}

export interface TerminalBoxData {
  title?: string;
  badge?: string;
  lines: string[];
  variant?: 'help' | 'status' | 'report' | 'certificate' | 'default' | 'battle' | 'map' | 'inventory';
}

export interface TerminalLine {
  id: string;
  type: 'system' | 'user' | 'narrative' | 'dialogue' | 'prompt' | 'success' | 'error' | 'report' | 'ascii' | 'help' | 'box';
  text: string;
  timestamp?: string;
  highlight?: boolean;
  boxData?: TerminalBoxData;
}
