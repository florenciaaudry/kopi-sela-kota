"use client";

import { useActionState, useState } from "react";

import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = {};

export function LoginForm({ disabled = false }: { disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialState,
  );
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="login-form">
      <label htmlFor="email">Email</label>
      <input
        autoComplete="username"
        disabled={disabled || pending}
        id="email"
        name="email"
        placeholder="nama@perusahaan.id"
        required
        type="email"
      />

      <label htmlFor="password">Password</label>
      <div className="password-field">
        <input
          autoComplete="current-password"
          disabled={disabled || pending}
          id="password"
          name="password"
          required
          type={showPassword ? "text" : "password"}
        />
        <button
          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          className="password-toggle"
          disabled={disabled || pending}
          onClick={() => setShowPassword((visible) => !visible)}
          type="button"
        >
          {showPassword ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>

      {state.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button className="primary-button login-submit" disabled={disabled || pending} type="submit">
        {pending ? "Memeriksa akun..." : "Masuk"}
      </button>
    </form>
  );
}
