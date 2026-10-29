import Icon from '../../../components/common/Icon';
import type { StudentDirectoryData } from '../../../websocket/protocol';
import { matchesStudentSearch } from '../../../utils/studentSearch';

interface ExistingStudentSearchProps {
  students: StudentDirectoryData[];
  enrolledStudentIds: Set<number>;
  query: string;
  onQueryChange: (query: string) => void;
  onAdd: (student: StudentDirectoryData) => void;
  addingStudentId: number | null;
  disabled: boolean;
  loading: boolean;
  error: string | null;
  onReload: () => void;
}

export default function ExistingStudentSearch({ students, enrolledStudentIds, query, onQueryChange, onAdd, addingStudentId, disabled, loading, error, onReload }: ExistingStudentSearchProps) {
  const matches = students.filter((student) => matchesStudentSearch(student, query));
  return (
    <section className="min-w-0 rounded-xl border border-[#dce7ea] bg-white p-5" aria-labelledby="existing-student-search-title">
      <h3 className="text-base font-bold" id="existing-student-search-title">Add existing student</h3>
      <p className="mt-1 text-sm leading-6 text-[#718087]">Search registered student accounts by full name or student ID, then add them to this course.</p>
      <div className="mt-4 flex items-center gap-2">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search registered students by name or student ID</span>
          <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#829096]" name="search" size={17} />
          <input className="h-11 w-full rounded-lg border border-[#d6e1e4] bg-[#f1f5f6] pl-10 pr-3 text-base outline-none focus:border-[#70b2be] focus:ring-4 focus:ring-[#00849a]/10" onChange={(event) => onQueryChange(event.target.value)} placeholder="Search name or student ID..." type="search" value={query} />
        </label>
        <button aria-label="Reload registered students" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#d6e1e4] text-[#00778b] hover:bg-[#edf7f8] disabled:opacity-50" disabled={disabled || loading} onClick={onReload} title="Reload registered students" type="button"><Icon name="refresh" size={17} /></button>
      </div>
      {loading ? <p className="mt-4 text-sm text-[#718087]" role="status">Loading registered students...</p>
        : error ? <p className="mt-4 text-sm text-[#b32c33]" role="alert">{error}</p>
          : !query.trim() ? <p className="mt-4 text-sm text-[#718087]">Enter a name or student ID to find students.</p>
            : <>
              <p className="mt-4 text-sm text-[#718087]" role="status">{matches.length} student{matches.length === 1 ? '' : 's'} found</p>
              <div className="mt-2 max-h-80 overflow-auto rounded-lg border border-[#e2eaed]">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <caption className="sr-only">Registered students matching your search</caption>
                  <thead className="sticky top-0 bg-[#f1f5f6] text-[#607178]"><tr><th className="px-4 py-3" scope="col">Full name</th><th className="px-4 py-3" scope="col">Student ID</th><th className="px-4 py-3 text-right" scope="col">Action</th></tr></thead>
                  <tbody>{matches.map((student) => {
                    const enrolled = enrolledStudentIds.has(student.id);
                    const inactive = student.active === false;
                    return <tr className="border-t border-[#e7edef]" key={student.id}>
                      <td className="px-4 py-3 font-semibold text-[#26353a]">{student.fullName}</td>
                      <td className="px-4 py-3 text-[#607178]">{student.username}</td>
                      <td className="px-4 py-3 text-right"><button aria-label={enrolled ? `${student.fullName} is already enrolled` : `Add ${student.fullName} (${student.username}) to course`} className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#00778b] px-3 text-sm font-semibold text-white hover:bg-[#006273] disabled:cursor-not-allowed disabled:bg-[#edf2f3] disabled:text-[#718087]" disabled={disabled || enrolled || inactive} onClick={() => onAdd(student)} type="button">{addingStudentId === student.id ? 'Adding...' : enrolled ? 'Already enrolled' : inactive ? 'Inactive' : <><Icon name="plus" size={14} />Add</>}</button></td>
                    </tr>;
                  })}{matches.length === 0 && <tr><td className="px-4 py-6 text-center text-[#718087]" colSpan={3}>No registered students match this name or student ID.</td></tr>}</tbody>
                </table>
              </div>
            </>}
    </section>
  );
}
