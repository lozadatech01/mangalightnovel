"use client";
import { useState } from "react";
export default function PasswordField() {
  const [revealed, setRevealed] = useState(false);
  return <div className="mn-password"><input name="password" id="mn-password" type={revealed ? "text" : "password"} required autoComplete="current-password"/><button type="button" onClick={() => setRevealed(!revealed)} aria-label={revealed ? "Hide password" : "Show password"} aria-pressed={revealed}>{revealed ? "Hide" : "Show"}</button></div>;
}
