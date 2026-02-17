// Simulate API calls
export const authService = {
    login: async (email: string): Promise<{ id: string; email: string; name: string }> => {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Simulate success
        if (email.includes('error')) {
            throw new Error('Invalid credentials');
        }

        return {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            email,
            name: 'Memory Architect',
        };
    },

    logout: async (): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
};
