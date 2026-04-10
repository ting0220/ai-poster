import TemplatesListView from "@/app/templates/_components/TemplatesListView";
import { isAuthenticated } from "@/app/_lib/auth";
import PasswordGate from "@/app/_components/PasswordGate";

export default async function AdminTemplatesPage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <PasswordGate redirectTo="/admin/templates" />;
  }

  return <TemplatesListView publicMode={false} />;
}
