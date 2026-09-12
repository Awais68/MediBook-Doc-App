import {
  Activity,
  Baby,
  Bone,
  Brain,
  BrainCircuit,
  Droplets,
  Ear,
  Eye,
  Filter,
  FlaskConical,
  HeartPulse,
  Smile,
  Sparkles,
  Stethoscope,
  ToyBrick,
  Wind,
  type LucideIcon,
} from "lucide-react";

/** Maps the `Specialty.icon` slug stored in the DB to a lucide component. */
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  sparkles: Sparkles,
  baby: Baby,
  "toy-brick": ToyBrick,
  bone: Bone,
  brain: Brain,
  ear: Ear,
  "brain-circuit": BrainCircuit,
  activity: Activity,
  droplets: Droplets,
  "flask-conical": FlaskConical,
  smile: Smile,
  eye: Eye,
  wind: Wind,
  filter: Filter,
};

export function SpecialtyIcon({ name, className }: { name?: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || Stethoscope;
  return <Icon className={className} aria-hidden />;
}
