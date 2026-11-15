import { Playground } from "@/components/organisms/playground/Playground";
import { aiConfigured } from "@/lib/providers";

// The page reads the server environment to disclose whether AI mode is on, so it renders per request.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Playground aiAvailable={aiConfigured(process.env)} />;
}
