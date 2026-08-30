import { SiteHeader } from "@/components/site-header"
import { Playground } from "@/components/playground"

export default function HomePage() {
  return (
    <>
      <SiteHeader active="playground" />
      <main className="flex flex-1 flex-col">
        <Playground />
      </main>
    </>
  )
}
