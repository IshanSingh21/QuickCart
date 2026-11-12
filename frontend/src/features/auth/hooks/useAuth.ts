import { useMutation, useQuery } from '@tanstack/react-query';
import {
  authService,
  establishAuthSession,
  performLogout
} from '../../../services/auth.service';
import { useAuthStore } from '../../../store/auth-store';
import { LoginRequest, RegisterRequest, User } from '../../../types';

export function useLoginMutation() {
  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (data) => {
      establishAuthSession(data);
    }
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: RegisterRequest) => authService.register(payload),
    onSuccess: (data) => {
      establishAuthSession(data);
    }
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: () => performLogout()
  });
}

export function useCurrentUserQuery() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authService.getMe();
      setUser(user);
      return user;
    },
    enabled: isAuthenticated && Boolean(accessToken),
    staleTime: 1000 * 60 * 5
  });
}
