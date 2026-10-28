import StudentPortalHeader from '../../components/layout/StudentPortalHeader';
import ProfileWorkspace from './ProfileWorkspace';

function StudentProfilePage() {
  return <main className="min-h-screen bg-[#f5f9fb]"><StudentPortalHeader currentSection="My profile" showNavigation={false} /><div className="mx-auto w-full max-w-[1180px] px-6 py-7 max-sm:px-4"><ProfileWorkspace expectedRole="STUDENT" /></div></main>;
}

export default StudentProfilePage;
