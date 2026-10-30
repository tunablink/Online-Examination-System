import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

export interface TeacherActivity {
  id: number; attemptId: number; examId: number; examTitle: string;
  studentId: number; studentName: string; institutionalId: string | null;
  rule: string; severity: 'INFO' | 'WARNING'; description: string;
  occurredAt: string; recordedAt: string;
}
interface Overview {
  activeAttempts: number; completedAttempts: number; warningEvents: number;
  activities: TeacherActivity[]; truncated: boolean; interpretation: string;
}
function isOverview(value: unknown): value is Overview {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  const count = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  return count(item.activeAttempts) && count(item.completedAttempts) && count(item.warningEvents)
    && typeof item.truncated === 'boolean' && typeof item.interpretation === 'string'
    && Array.isArray(item.activities) && item.activities.every((value: unknown) => {
      if (typeof value !== 'object' || value === null) return false;
      const event = value as Record<string, unknown>;
      return ['id', 'attemptId', 'examId', 'studentId'].every((key) => count(event[key]))
        && (event.institutionalId === null || typeof event.institutionalId === 'string')
        && ['examTitle', 'studentName', 'rule', 'description', 'occurredAt', 'recordedAt']
          .every((key) => typeof event[key] === 'string')
        && (event.severity === 'INFO' || event.severity === 'WARNING');
    });
}
export function useTeacherMonitoring() {
  const { status, sendMessage, subscribe } = useWebSocket();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (status !== 'connected') return;
    let disposed = false;
    const accept = (value: unknown) => {
      if (disposed) return;
      setLoading(false);
      if (!isOverview(value)) { setError('The server returned invalid monitoring data.'); return; }
      setData(value); setError(null);
    };
    const unsubscribe = subscribe('TEACHER_MONITORING', (message) => {
      if (message.requestId === null) accept(message.data);
    });
    const timer = window.setTimeout(() => {
      setLoading(true);
      const request = sendMessage('GET_TEACHER_MONITORING', { live: true }, (message) => {
        if (disposed) return;
        if (message.type === 'TEACHER_MONITORING') accept(message.data);
        else { setLoading(false); setError(message.error?.message ?? 'Monitoring could not be loaded.'); }
      });
      if (request === null) { setLoading(false); setError('The monitoring request could not be sent.'); }
    }, 0);
    return () => {
      disposed = true; window.clearTimeout(timer); unsubscribe();
      sendMessage('GET_TEACHER_MONITORING', { live: false });
    };
  }, [status, sendMessage, subscribe, revision]);
  return { data, loading, refresh, error: status === 'connected' ? error : 'Waiting for the examination server.' };
}
