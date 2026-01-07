import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class InputSanitizerService {

    sanitize(value: string): string {
        // Allow alphanumeric, spaces, and common punctuation for names/text.
        // Disallow special characters that might be used for injection or look broken.
        // Kept broadly compatible: a-z, A-Z, 0-9, space, dot, underscore, dash.
        return value.replace(/[^a-zA-Z0-9 _.-]/g, '');
    }

    sanitizeName(value: string): string {
        // Stricter for names: only letters, spaces, dots
        return value.replace(/[^a-zA-Z .]/g, '');
    }

    sanitizeAlphaNumeric(value: string): string {
        return value.replace(/[^a-zA-Z0-9]/g, '');
    }

    sanitizeNumeric(value: string): string {
        return value.replace(/[^0-9]/g, '');
    }
}
