import { useCallback, useEffect, useState } from 'react';
import type { ExamMonitoringData, ServerExam } from '../../websocket/protocol';
import { useWebSocket } from '../../websocket/useWebSocket';
import { readExams, readMonitoring } from './monitoringData';

export function useExamMonitoring(examId: number) {
  const { status, sendMessage, subscribe } = useWebSocket();
  const [data, setData] = useState<ExamMonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [exam, setExam] = useState<ServerExam | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (status !== 'connected') return;
    let disposed = false;
    let pending = false;
    let pushVersion = 0;
    const accept = (value: unknown) => {
      const snapshot = readMonitoring(value, examId);
      if (snapshot === null) return false;
      setData(snapshot); setUpdatedAt(new Date().toISOString()); setError(null); setLoading(false);
      return true;
    };
    const unsubscribe = subscribe('EXAM_MONITORING', (message) => {
      if (disposed || message.requestId !== null || message.data?.examId !== examId) return;
      if (accept(message.data)) pushVersion++;
    });
    const load = () => {
      if (disposed || pending) return;
      pending = true;
      const version = pushVersion;
      const request = sendMessage('GET_EXAM_MONITORING', { examId, live: true }, (message) => {
        pending = false;
        if (disposed || version !== pushVersion) return;
        setLoading(false);
        if (message.type !== 'EXAM_MONITORING' || !accept(message.data))
          setError(message.error?.message ?? 'Monitoring data could not be loaded. Please retry.');
      });
      if (request === null) { pending = false; setLoading(false); setError('The monitoring request could not be sent.'); }
    };
    const first = window.setTimeout(() => {
      setLoading(true); setError(null); load();
      sendMessage('GET_EXAM', { examId }, (message) => {
        if (disposed || message.type !== 'EXAM_DETAILS') return;
        const exams = readExams([message.data]);
        if (exams?.[0]?.id === examId) setExam(exams[0]);
      });
    }, 0);
    // Reconcile missed pushes and retry a failed initial subscription without a busy loop.
    const timer = window.setInterval(load, 30_000);
    const onFocus = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    return () => {
      disposed = true; unsubscribe(); window.clearTimeout(first); window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      sendMessage('GET_EXAM_MONITORING', { examId, live: false });
    };
  }, [examId, status, sendMessage, subscribe, revision]);
  return { data, exam, loading, error, updatedAt, refresh, connected: status === 'connected', status };
}
