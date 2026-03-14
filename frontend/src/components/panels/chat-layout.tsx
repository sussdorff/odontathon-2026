import { ChatPanel } from '@/components/panels/chat-panel'
import { CodesPanel } from '@/components/panels/codes-panel'
import { CostPanel } from '@/components/panels/cost-panel'

export function ChatLayout() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[60fr_25fr_15fr] gap-4 items-start">
      <div className="lg:row-span-2">
        <ChatPanel />
      </div>
      <CodesPanel />
      <CostPanel />
    </div>
  )
}
