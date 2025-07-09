// Placeholder useAuth hook for backwards compatibility
// Authentication has been removed from the system
export function useAuth() {
  return {
    user: { id: 1, username: "user" },
    isLoading: false,
    isAuthenticated: true,
    logout: () => {},
    error: null,
  };
}