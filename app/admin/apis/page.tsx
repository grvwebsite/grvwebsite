import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/admin-auth'
import ApisManager from './apis-manager'

export default async function ApisPage() {
  if (!await getAdmin()) redirect('/admin/login')
  return <ApisManager />
}
