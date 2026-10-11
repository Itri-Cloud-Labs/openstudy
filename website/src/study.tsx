import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { onSubject, readableSubject } from './colors';
import { MODES, SUBJECTS } from './data';

export interface StudyState {
  subject: string;
  provider: string;
  model: string;
  reasoning: string;
  material: string;
  language: string;
  mode: number;
  summary: 'loading' | 'ready';
}

interface Study {
  state: StudyState;
  modelLabel: string;
  sessionTerm: RefObject<HTMLDivElement | null>;
  set: (patch: Partial<StudyState>) => void;
  setMode: (index: number) => void;
  startSession: () => void;
}

const INITIAL: StudyState = {
  subject: 'Computer Science',
  provider: 'Codex',
  model: 'gpt-5.5',
  reasoning: 'high',
  material: 'notes/sorting.md',
  language: 'English',
  mode: 0,
  summary: 'loading',
};

const SUMMARY_DELAY = 2600;

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const StudyContext = createContext<Study | null>(null);

export function useStudy() {
  const study = useContext(StudyContext);
  if (!study) throw new Error('useStudy must be used inside StudyProvider.');
  return study;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(INITIAL);
  const sessionTerm = useRef<HTMLDivElement>(null);
  const summaryTimer = useRef<number | undefined>(undefined);
  const summaryStarted = useRef(false);

  const set = useCallback((patch: Partial<StudyState>) => setState(current => ({ ...current, ...patch })), []);

  const setMode = useCallback((index: number) => set({ mode: (index + MODES.length) % MODES.length }), [set]);

  const generateSummary = useCallback(() => {
    summaryStarted.current = true;
    window.clearTimeout(summaryTimer.current);
    set({ summary: 'loading', mode: 0 });
    summaryTimer.current = window.setTimeout(() => set({ summary: 'ready' }), SUMMARY_DELAY);
  }, [set]);

  const startSession = useCallback(() => {
    sessionTerm.current?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'center' });
    generateSummary();
  }, [generateSummary]);

  // The selected subject colors the prompt rail, selections, and the glow under the hero terminal.
  useEffect(() => {
    const subject = SUBJECTS.find(item => item.name === state.subject) ?? SUBJECTS[2];
    const root = document.documentElement.style;
    root.setProperty('--subject', subject.color);
    root.setProperty('--subject-text', readableSubject(subject.color));
    root.setProperty('--on-subject', onSubject(subject.color));
  }, [state.subject]);

  // The summary generates the first time the session scrolls into view.
  useEffect(() => {
    const term = sessionTerm.current;
    if (!term) return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        if (!summaryStarted.current) generateSummary();
      },
      { threshold: 0.45 },
    );
    observer.observe(term);
    return () => observer.disconnect();
  }, [generateSummary]);

  useEffect(() => () => window.clearTimeout(summaryTimer.current), []);

  const modelLabel = `${state.provider}/${state.model}`;

  return (
    <StudyContext.Provider value={{ state, modelLabel, sessionTerm, set, setMode, startSession }}>
      {children}
    </StudyContext.Provider>
  );
}
