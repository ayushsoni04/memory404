import React, { useState } from "react";

/** Password row with a Show / Hide control, matching the site sign-in field. */
export default function PasswordField({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  required = true,
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="password-field">
      <input
        id={id}
        className="settings-input"
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        required={required}
      />
      <button
        type="button"
        className="password-reveal"
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => setShown((current) => !current)}
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
