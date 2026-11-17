import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata: Metadata = {
  title: "合言葉｜Title Studio",
};

export default function LoginPage() {
  return <LoginScreen />;
}
