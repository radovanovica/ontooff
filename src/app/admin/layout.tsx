import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@/types';
import Navbar from '@/components/layout/Navbar';
import { Box, Container } from '@mui/material';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </>
  );
}
