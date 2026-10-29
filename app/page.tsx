import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ROLE_COOKIE, RT_COOKIE } from '@/lib/server/session';
import { ROLE_HOME, type Role } from '@/lib/constants/roles';

export default async function Home() {
  const jar = await cookies();
  const role = jar.get(ROLE_COOKIE)?.value as Role | undefined;
  if (jar.get(RT_COOKIE)?.value && role && ROLE_HOME[role]) redirect(ROLE_HOME[role]);
  redirect('/login');
}
