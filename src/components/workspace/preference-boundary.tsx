import { getCurrentUser } from "@/lib/auth/session";
import { PreferenceProvider } from "./preference-provider";
export async function PreferenceBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return user ? (
    <PreferenceProvider key={user.id} userId={user.id}>
      {children}
    </PreferenceProvider>
  ) : (
    children
  );
}
