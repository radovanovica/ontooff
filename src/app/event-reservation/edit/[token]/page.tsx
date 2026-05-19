import { redirect } from 'next/navigation';
export default async function EventReservationEditPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect('/registration/edit/' + token);
}