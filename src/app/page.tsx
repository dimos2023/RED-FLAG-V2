import { IntroCurtain } from "@/components/intro-curtain";
import { SiteHeader } from "@/components/site-header";
import { HomeContent } from "@/components/home-content";

export default function HomePage() {
  return (
    <IntroCurtain>
      <SiteHeader />
      <HomeContent />
    </IntroCurtain>
  );
}
