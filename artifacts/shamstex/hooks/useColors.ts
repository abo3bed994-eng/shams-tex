import { useApp } from "@/context/AppContext";
import colors from "@/constants/colors";

export function useColors() {
  const { theme } = useApp();
  const palette = theme === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
