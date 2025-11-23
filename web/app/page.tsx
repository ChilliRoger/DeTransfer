import dynamic from 'next/dynamic'
import Hero from '@/components/Hero'
import InfoSection from '@/components/InfoSection'

// Lazy load below-the-fold components for better initial performance
const RoadmapSection = dynamic(() => import('@/components/RoadmapSection'), {
  loading: () => <div className="min-h-screen" />,
  ssr: true
})

const DemoSection = dynamic(() => import('@/components/DemoSection'), {
  loading: () => <div className="min-h-screen" />,
  ssr: true
})

const TutorialSection = dynamic(() => import('@/components/TutorialSection'), {
  loading: () => <div className="min-h-screen" />,
  ssr: true
})

const FAQSection = dynamic(() => import('@/components/FAQSection'), {
  loading: () => <div className="min-h-screen" />,
  ssr: true
})

export default function Home() {
  return (
    <>
      <Hero />
      <InfoSection />
      <RoadmapSection />
      <DemoSection />
      <FAQSection />
    </>
  )
}

