export const CATEGORIES = [
  { id: "refund_exchange", label: "환불/교환" },
  { id: "shipping", label: "배송/배송지연" },
  { id: "product_inquiry", label: "제품 문의" },
  { id: "payment", label: "결제/결제오류" },
  { id: "complaint", label: "불만/클레임" },
  { id: "other", label: "기타" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];
