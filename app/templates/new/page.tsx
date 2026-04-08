import React from "react";
import dynamic from "next/dynamic";
import { isAuthenticated } from "@/app/_lib/auth";
import PasswordGate from "@/app/_components/PasswordGate";

const TemplateEditorClient = dynamic(
  () => import("@/app/templates/_components/TemplateEditorClient"),
  { ssr: false }
);

export default async function NewTemplatePage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <PasswordGate redirectTo="/templates/new" />;
  }

  return <TemplateEditorClient />;
}
