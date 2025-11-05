import { environment } from '../environments/environment';

export const AppConfig = {
  apiBaseUrl: environment.apiUrl,
  endpoints: {
    auth: {
      login: 'auth/login',
      logout: 'auth/logout'
    },
    users: {
      list: 'users',
      detail: (id: string) => `users/${id}`
    }
  }
};
