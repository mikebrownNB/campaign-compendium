import { UserSidebar } from '@/components/UserSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 ml-0 md:ml-56 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
