import { MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui'
import { statusCopy } from '../status-config'

export function StatusCardFooter() {
  return (
    <Button variant="ghost" size="sm" className="text-neutral-500">
      <MoreHorizontal />
      {statusCopy.actions.detail}
    </Button>
  )
}
