export const routes = {
  home: "/",
  items: "/items",
  login: "/login",
  register: "/register",
  favorites: "/favorites",
  item: (id: string) => `/items/${id}`,
} as const;
