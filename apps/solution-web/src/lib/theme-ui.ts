/** bootstrap theme.ui.cardRadius → Tailwind rounded-* */
export function cardRadiusClass(r: string | undefined): string {
  switch (r) {
    case "none":
      return "rounded-none";
    case "sm":
      return "rounded-md";
    case "md":
      return "rounded-lg";
    case "xl":
    default:
      return "rounded-2xl";
  }
}
