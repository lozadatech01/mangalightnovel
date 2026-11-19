import AuthCard from "@/app/components/auth-card";
import Link from "next/link";
import {signIn} from "@/app/actions/auth";
import {redirectSignedIn} from "@/lib/auth/authorization";
import PasswordField from "./password-field";
const messages:Record<string,string>={invalid:"Incorrect email or password.",unconfirmed:"Verify your email before signing in.",suspended:"This account has been suspended. Contact the department administrator.",unauthorized:"This account is not authorized for this department.",configuration:"Authentication is not configured.","invalid-link":"The verification link is invalid or expired."};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string;notice?:string}>}) {
 await redirectSignedIn();
 const p=await searchParams;
 const error=p.error?messages[p.error]??messages.invalid:null;
 const notice=p.notice==="password-reset"?"Password updated. Sign in with your new password.":p.notice==="check-email"?"If registration was accepted, check your email for a confirmation link.":null;
return <AuthCard><h1>Manga &<br/>Light Novel</h1><p className="mn-subtitle">Readers, authors, and publishing partners</p>
 {error&&<p role="alert" className="mn-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <form action={signIn}><label htmlFor="mn-email">Email or username</label><input id="mn-email" name="email" type="text" autoComplete="username" required/>
 <label htmlFor="mn-password">Password</label><PasswordField/><Link className="mt-3 inline-block text-sm font-semibold underline underline-offset-4" href="/forgot-password">Forgot password?</Link>
      <button className="mn-submit" type="submit">Sign in</button></form>
 <p><Link className="portal-inline-link" href="/register">Create reader or creator account</Link></p>
 </AuthCard>;
}
