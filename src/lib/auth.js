export const getCurrentUser = () => {
    const userStr = localStorage.getItem("invigo_user");
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
};

export const isLoggedIn = () => {
    return getCurrentUser() !== null;
};

export const hasRole = (...roles) => {
    const user = getCurrentUser();
    if (!user || !user.role) return false;
    // Map roles to upper case explicitly for case-insensitive comparison
    const formattedRoles = roles.map(role => role.trim().toUpperCase());
    return formattedRoles.includes(user.role.trim().toUpperCase());
};

export const logout = () => {
    localStorage.removeItem("invigo_user");
};
