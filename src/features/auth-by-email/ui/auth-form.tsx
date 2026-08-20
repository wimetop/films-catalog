"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { routes } from "@/config/constants";
import { authClient } from "@/shared/api/auth/auth-client";

import type { AuthMode, LoginFormValues, RegisterFormValues } from "../model/types";

type AuthFormProps = {
  mode: AuthMode;
  callbackUrl: string;
};

type FormValues = LoginFormValues & Partial<Pick<RegisterFormValues, "name">>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode, callbackUrl }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const { formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<FormValues>({
    defaultValues: { email: "", password: "", name: "" },
  });

  const onSubmit = async (values: FormValues) => {
    const result = isRegister
      ? await authClient.signUp.email({ name: values.name ?? "", email: values.email, password: values.password })
      : await authClient.signIn.email({ email: values.email, password: values.password });

    if (result.error) {
      setError("root", { message: result.error.message ?? "Не вдалося виконати дію. Спробуйте ще раз." });
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  };

  const emailField = register("email", {
    required: "Вкажіть email.",
    pattern: { value: emailPattern, message: "Вкажіть коректний email." },
  });
  const passwordField = register("password", {
    required: "Вкажіть пароль.",
    minLength: { value: 8, message: "Пароль має містити щонайменше 8 символів." },
  });

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div>
        <p className="eyebrow">Films Catalog</p>
        <h1>{isRegister ? "Створити акаунт" : "Увійти"}</h1>
        <p className="auth-form__lead">{isRegister ? "Збережіть фільми, до яких хочете повернутися." : "Увійдіть, щоб переглядати власне обране."}</p>
      </div>

      {isRegister ? <Field label="Ім’я" error={errors.name?.message}><input id="name" autoComplete="name" aria-describedby={errors.name ? "name-error" : undefined} aria-invalid={Boolean(errors.name)} {...register("name", { required: "Вкажіть ім’я." })} /></Field> : null}
      <Field label="Email" error={errors.email?.message}><input id="email" type="email" autoComplete="email" aria-describedby={errors.email ? "email-error" : undefined} aria-invalid={Boolean(errors.email)} {...emailField} /></Field>
      <Field label="Пароль" error={errors.password?.message}><input id="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} aria-describedby={errors.password ? "password-error" : undefined} aria-invalid={Boolean(errors.password)} {...passwordField} /></Field>
      {errors.root ? <p className="form-error" role="alert">{errors.root.message}</p> : null}

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Зачекайте…" : isRegister ? "Зареєструватися" : "Увійти"}
      </button>
      <p className="auth-form__switch">
        {isRegister ? "Вже є акаунт?" : "Ще немає акаунта?"} {" "}
        <Link className="text-link" href={isRegister ? routes.login : routes.register}>{isRegister ? "Увійти" : "Зареєструватися"}</Link>
      </p>
    </form>
  );
}

type FieldProps = { label: string; error?: string; children: React.ReactNode };

function Field({ label, error, children }: FieldProps) {
  const id = label === "Email" ? "email" : label === "Пароль" ? "password" : "name";
  const errorId = `${id}-error`;

  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      {children}
      {error ? <span className="form-error" id={errorId} role="alert">{error}</span> : null}
    </label>
  );
}
