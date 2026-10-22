export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const usernameRegex = /^[A-Za-z0-9_-]{3,20}$/;
export const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export const messages = {
  email: "Invalid email format",
  username: "Username must be 3-20 characters: letters, numbers, _ or -",
  password: "Password must be at least 8 characters, contain one uppercase letter and one number",
};
