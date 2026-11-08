import Link from "next/link";
import {register} from "@/app/actions/auth";
import NewPasswordFields from "./password-fields";

const errors:Record<string,string>={
 invalid:"Check the form, password confirmation, and minimum 12-character password.",
 failed:"Could not create this account. Review the details and try again.",
 configuration:"Account registration is unavailable."
};
export default async function CreateInkAccount({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main className="ink-signup"><div className="ink-signup-shell">
  <section className="ink-signup-intro"><div>
   <span className="ink-kicker">LOXADA / INK</span>
   <h1>Stories start here.</h1>
   <p>One Manga &amp; Light Novel space for people who read and for independent authors who want to submit original work.</p>
  </div>
  <p className="ink-signup-note">Reading is free for eligible releases. Authors register here first, then complete an application inside their account. Publishers join by invitation.</p>
  </section>
  <section className="ink-signup-form">
   <h2>Create your account</h2><p>Start with a few details. You can sign in after completing email verification.</p>
   {error&&<p className="ink-message" role="alert">{errors[error]??errors.failed}</p>}
   <form action={register}>
    <label htmlFor="ink-name">Name shown on your account<input id="ink-name" name="display_name" autoComplete="name" maxLength={80} minLength={2} required/></label>
    <label htmlFor="ink-role">I want to join as<select id="ink-role" name="account_type" required>
     <option value="reader">Reader — read Manga &amp; Light Novels</option>
     <option value="creator">Independent author — apply to publish</option>
    </select></label>
    <label htmlFor="ink-email">Email address<input id="ink-email" name="email" type="email" autoComplete="email" maxLength={254} required/></label>
    <NewPasswordFields/>
    <button type="submit">Create account</button>
   </form>
   <p className="ink-subtext">Creating an author account does not authorize publication. Publishing rights and manuscripts are reviewed separately.</p>
   <Link href="/login" className="ink-text-link">Already registered? Sign in</Link>
  </section>
 </div></main>;
}
