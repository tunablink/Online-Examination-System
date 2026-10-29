export interface RegisterFormState{
    username: string;
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export const EMPTY_REGISTER_FORM: RegisterFormState = {
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
};

export function validateRegisterForm(form: RegisterFormState): string | null {
    const normalizedUsername = form.username.trim();
    const normalizedFullName = form.fullName.trim();
    const normalizedEmail = form.email.trim();

    if (!/^[a-zA-Z0-9._-]{3,50}$/.test(normalizedUsername)){
        return 'Student ID must be 3–50 characters long and contain only letters, digits, dots, underscores, or hyphens.';
    }

    if (normalizedFullName.length < 2 || normalizedFullName.length > 100){
        return 'Full name must be between 2 and 100 characters long.';
    }

    if (normalizedEmail.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)){
        return 'Please enter a valid email address.';
    }

    if (form.password.length < 8){
        return 'The password must contain at least 8 characters.';
    }

    if (new TextEncoder().encode(form.password).length > 72)  
        return 'The password must not exceed 72 UTF-8 bytes.';

    if (form.password !== form.confirmPassword){
        return 'The password confirmation does not match.';
    }

    return null;
}
