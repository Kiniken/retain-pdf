import { Download } from 'lucide-react'

import { Button } from '@/components/ui'
import { statusCopy } from '../status-config'

type StatusResultActionsProps = {
  pdfReady?: boolean
  readerReady?: boolean
}

export function StatusResultActions({ pdfReady = true, readerReady = true }: StatusResultActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {readerReady ? (
        <Button variant="outline" size="sm">
          {statusCopy.actions.reader}
        </Button>
      ) : null}
      {pdfReady ? (
        <Button size="sm">
          <Download />
          {statusCopy.actions.downloadPdf}
        </Button>
      ) : null}
    </div>
  )
}
