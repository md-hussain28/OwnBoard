import { SignIn } from "@clerk/nextjs";
import { APP_HOME } from "@/lib";

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-5xl justify-center px-6 py-10">
      <SignIn forceRedirectUrl={APP_HOME} signUpForceRedirectUrl={APP_HOME} />
    </div>
  );
}
