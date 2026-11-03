import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/admin-auth'
import ApiRotationManager from './rotation-manager'

export default async function ApiRotationPage() {
  if (!(await getAdmin())) redirect('/admin/login')
  return <ApiRotationManager />
}
