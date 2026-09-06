import DoctorsSection from "@/components/DoctorsSection";
import Header from "@/components/Header";

export default function Doctors({ searchParams }) {
  console.log("searchParams=>", searchParams );
  return (
    <div>
      <DoctorsSection />
    </div>
  );
}
