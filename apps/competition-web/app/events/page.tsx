import { redirect } from "next/navigation";

/** Past events are the home page's Past tab now. */
export default function PastEventsPage() {
  redirect("/?tab=past");
}
