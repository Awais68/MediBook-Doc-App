import DoctorsSection from "@/components/DoctorsSection";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categories } from "@/lib/data";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <DoctorsSection isHome={true} />
    </div>
  );
}
