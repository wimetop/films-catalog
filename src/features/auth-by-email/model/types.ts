export type AuthMode = "login" | "register";

export type LoginFormValues = {
  email: string;
  password: string;
};

export type RegisterFormValues = LoginFormValues & {
  name: string;
};
