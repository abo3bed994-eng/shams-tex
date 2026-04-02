import React from "react";
import {
  ArrowRight,
  Award,
  Bell,
  BellOff,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Pencil,
  PenLine,
  Eye,
  Film,
  LayoutGrid,
  House,
  Image,
  Info,
  Layers,
  Lock,
  Minus,
  Moon,
  Package,
  Phone,
  PhoneCall,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react-native";

const iconMap: Record<string, React.ComponentType<any>> = {
  "arrow-right": ArrowRight,
  award: Award,
  bell: Bell,
  "bell-off": BellOff,
  camera: Camera,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  clock: Clock,
  "edit-2": Pencil,
  "edit-3": PenLine,
  eye: Eye,
  film: Film,
  grid: LayoutGrid,
  home: House,
  image: Image,
  info: Info,
  layers: Layers,
  lock: Lock,
  minus: Minus,
  moon: Moon,
  package: Package,
  phone: Phone,
  "phone-call": PhoneCall,
  plus: Plus,
  search: Search,
  "shopping-cart": ShoppingCart,
  star: Star,
  sun: Sun,
  "trash-2": Trash2,
  user: User,
  x: X,
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function Icon({ name, size = 24, color = "#fff", style }: IconProps) {
  const LucideIcon = iconMap[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} color={color} style={style} />;
}
