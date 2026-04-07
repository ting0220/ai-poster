import React from "react";
import TemplateEditorClient from "@/app/templates/_components/TemplateEditorClient";
import { isAuthenticated } from "@/app/_lib/auth";
import PasswordGate from "@/app/_components/PasswordGate";

export default async function NewTemplatePage() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return <PasswordGate redirectTo="/templates/new" />;
  }

  return <TemplateEditorClient />;
}
