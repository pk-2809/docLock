import { Pipe, PipeTransform } from '@angular/core';
import { Notification } from '../../core/services/notification.service';

@Pipe({
    name: 'notificationMessage',
    standalone: true
})
export class NotificationMessagePipe implements PipeTransform {
    transform(notification: Notification): string {
        if (!notification.message) return '';

        // Check for itemType in metadata OR root (common backend inconsistency)
        const type = notification.metadata?.itemType || notification['itemType'] || notification['type'];

        if (type) {
            let typeLabel = '';

            // Normalize type check
            const lowerType = String(type).toLowerCase();

            if (lowerType.includes('card')) {
                typeLabel = 'credit card'; // Using "credit card" as generic/requested label
            } else if (lowerType.includes('doc') || lowerType === 'file') {
                typeLabel = 'document';
            }

            if (typeLabel) {
                // Regex to find content in quotes "foo" or 'foo'
                // Replaces "Item Name" with "Item Name" typeLabel
                return notification.message.replace(/["']([^"']+)["']/, (match) => `${match} ${typeLabel}`);
            }
        }

        return notification.message;
    }
}
