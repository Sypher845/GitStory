import { redirect } from "next/navigation";

/**
 * Root page - redirects to chat interface
 */
export default function Home() {
  redirect("/chat");
}
