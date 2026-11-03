import { redirect } from 'next/navigation'
import { getAdmin } from '@/lib/admin-auth'
import OwnerExportForm from './owner-export-form'
export default async function Page() { if (!await getAdmin()) redirect('/admin/login'); return <OwnerExportForm /> }
