import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { FACTORIES, FactoryId } from '@/types'
import { Building2 } from 'lucide-react'

export default function FactorySelector() {
  const { t, i18n } = useTranslation()
  const { currentFactory, setCurrentFactory, canSwitchFactory } = useAuthStore()
  const isAdmin = canSwitchFactory()
  const lang = i18n.language as 'ko' | 'vi'

  const getFactoryName = (factoryId: FactoryId) => {
    const factory = FACTORIES[factoryId]
    return lang === 'vi' ? factory.name_vi : factory.name_ko
  }

  if (!isAdmin) {
    // Non-admin: show current factory as badge (non-interactive)
    return (
      <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5 text-sm font-medium text-primary">
        <Building2 className="h-4 w-4" />
        <span>{getFactoryName(currentFactory)}</span>
      </div>
    )
  }

  // Admin: dropdown selector
  return (
    <div className="flex items-center gap-1.5">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <select
        value={currentFactory}
        onChange={(e) => setCurrentFactory(e.target.value as FactoryId)}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
        title={t('factory.switch')}
      >
        {(Object.keys(FACTORIES) as FactoryId[]).map((fid) => (
          <option key={fid} value={fid}>
            {getFactoryName(fid)} ({fid})
          </option>
        ))}
      </select>
    </div>
  )
}
