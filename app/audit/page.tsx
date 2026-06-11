import { redirect } from 'next/navigation';

export default function RedirectAudit() {
  redirect('/dashboard/audit');
}
