export interface QuestionEditorChoice {
  id: string;
  content: string;
  correct: boolean;
}

export interface QuestionEditorQuestion {
  id: string;
  content: string;
  points: number;
  choices: QuestionEditorChoice[];
}

export interface QuestionEditorDraft {
  content: string;
  points: string;
  choices: QuestionEditorChoice[];
}