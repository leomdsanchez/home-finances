export const formatDateYMD = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const todayYMD = (): string => formatDateYMD(new Date());

export const currentMonthLabelPtBR = (base: Date = new Date()): string => {
  const month = base.toLocaleString("pt-BR", { month: "long" });
  return `${month.charAt(0).toUpperCase()}${month.slice(1)}/${base.getFullYear()}`;
};

export const formatYMDToPtBR = (ymd: string): string => {
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const [y, m, d] = parts;
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
};
