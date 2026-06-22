const FALLBACKS = {
  logo: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect width=%2248%22 height=%2248%22 rx=%2224%22 fill=%22%23f0fdf4%22/%3E%3Crect x=%2210%22 y=%2218%22 width=%2228%22 height=%2224%22 rx=%223%22 fill=%22%23dcfce7%22/%3E%3Cpath d=%22M6 18 L15 8 L33 8 L42 18%22 fill=%22none%22 stroke=%22%2386efac%22 stroke-width=%222.5%22 stroke-linecap=%22round%22/%3E%3Crect x=%2215%22 y=%2224%22 width=%227%22 height=%2212%22 rx=%221.5%22 fill=%22%2386efac%22/%3E%3Crect x=%2226%22 y=%2224%22 width=%227%22 height=%2212%22 rx=%221.5%22 fill=%22%2386efac%22/%3E%3C/svg%3E",
  cover: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 800 200%22%3E%3Crect width=%22800%22 height=%22200%22 fill=%22%23f0fdf4%22/%3E%3Ccircle cx=%22400%22 cy=%2280%22 r=%2235%22 fill=%22%23dcfce7%22/%3E%3Crect x=%22350%22 y=%22130%22 width=%22100%22 height=%228%22 rx=%224%22 fill=%22%2386efac%22/%3E%3Crect x=%22370%22 y=%22148%22 width=%2260%22 height=%226%22 rx=%223%22 fill=%22%23dcfce7%22/%3E%3C/svg%3E",
  product: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect width=%2248%22 height=%2248%22 rx=%228%22 fill=%22%23fefce8%22/%3E%3Crect x=%2212%22 y=%2214%22 width=%2224%22 height=%2226%22 rx=%222%22 fill=%22%23fef9c3%22/%3E%3Crect x=%2212%22 y=%2214%22 width=%2224%22 height=%228%22 rx=%221%22 fill=%22%23fef08a%22/%3E%3Cline x1=%2212%22 y1=%2220%22 x2=%2236%22 y2=%2220%22 stroke=%22%23eab308%22 stroke-width=%221%22/%3E%3Crect x=%2220%22 y=%2226%22 width=%228%22 height=%2214%22 rx=%221%22 fill=%22%23fef08a%22/%3E%3C/svg%3E",
} as const;

export function safeImage(src: string | null | undefined, fallbackType: keyof typeof FALLBACKS = "product"): string {
  if (!src) return FALLBACKS[fallbackType];
  if (src.includes("picsum.photos")) return FALLBACKS[fallbackType];
  return src;
}
