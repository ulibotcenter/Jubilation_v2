import { redirect } from "next/navigation";
import { DASHBOARD_PORTFOLIO_PATH } from "@/lib/routes";

export default function PortfolioPage() {
  redirect(DASHBOARD_PORTFOLIO_PATH);
}