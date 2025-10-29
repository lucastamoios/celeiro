import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DateInput = Date | string | number;

interface FormatOptions {
    includeTime?: boolean;
    includeSeconds?: boolean;
}

/**
 * Converts a date to Brazilian format (dd/MM/yyyy)
 * @param date - The date to format (Date object, ISO string, or timestamp)
 * @param options - Formatting options
 * @returns Formatted date string
 * @throws Error if the date is invalid
 */
export function formatToBrazilianDate(
    date: DateInput,
    options: FormatOptions = {}
): string {
    const {
        includeTime = true,
        includeSeconds = false
    } = options;

    try {
        const dateObject = new Date(date);

        if (isNaN(dateObject.getTime())) {
            throw new Error('Invalid date provided');
        }

        let formatString = 'dd/MM/yyyy';

        if (includeTime) {
            formatString += includeSeconds ? ', HH:mm:ss' : ', HH:mm';
        }

        return format(dateObject, formatString, {
            locale: ptBR
        });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Error formatting date:', error.message);
        }
        throw new Error('Invalid date format provided');
    }
}