// sw.js
const CACHE_NAME = 'diary-cache-v1';
const ICON_PATH = 'diary-icon-192.png'; // Make sure this icon exists in your root

let remindersStore = {}; // Use an object to store reminders by ID: { reminderId: {config, timeoutId} }

function calculateNextNotificationTime(reminder) {
    const now = new Date();
    const [hours, minutes] = reminder.time.split(':');
    let notificationTime;

    if (reminder.type === 'once' && reminder.date) {
        const [year, month, day] = reminder.date.split('-').map(Number);
        notificationTime = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0);
        if (notificationTime <= now) return null; // Past
    } else {
        let candidateDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hours), parseInt(minutes), 0);
        if (reminder.type === 'daily') {
            if (candidateDate <= now) {
                candidateDate.setDate(candidateDate.getDate() + 1);
            }
        } else if (reminder.type === 'weekly' && reminder.days && reminder.days.length > 0) {
            for (let i = 0; i < 14; i++) { // Check for next 2 weeks
                let checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, parseInt(hours), parseInt(minutes), 0);
                if (reminder.days.includes(checkDate.getDay()) && checkDate > now) {
                    candidateDate = checkDate;
                    break;
                }
                if (i === 13) return null; // No valid day found in next 2 weeks
            }
        } else { return null; } // Unknown type or no days for weekly
        notificationTime = candidateDate;
    }
    return notificationTime;
}

function scheduleNotification(reminder) {
    if (!reminder || !reminder.id) {
        console.error('[SW] Invalid reminder object to schedule:', reminder);
        return;
    }
    
    const notificationTime = calculateNextNotificationTime(reminder);
    if (!notificationTime) {
        console.log(`[SW] No valid future time for reminder ${reminder.id}. Not scheduling.`);
        // If it was a one-time reminder and past, it should be cleared by the main app or here
        if (reminder.type === 'once' && remindersStore[reminder.id]) {
             delete remindersStore[reminder.id];
             console.log(`[SW] Deleted past one-time reminder ${reminder.id} from SW store.`);
        }
        return;
    }

    const delay = notificationTime.getTime() - Date.now();
    if (delay < 0) { // Should be caught by calculateNextNotificationTime, but as a safeguard
        console.log(`[SW] Negative delay for ${reminder.id}, not scheduling.`);
        return;
    }

    console.log(`[SW] Scheduling: ${reminder.id} at ${notificationTime} (in ~${Math.round(delay/60000)} min)`);

    // Clear existing timeout for this reminder ID before setting a new one
    if (remindersStore[reminder.id] && remindersStore[reminder.id].timeoutId) {
        clearTimeout(remindersStore[reminder.id].timeoutId);
    }

    const timeoutId = setTimeout(() => {
        console.log(`[SW] Showing notification for: ${reminder.id}`);
        self.registration.showNotification(reminder.title || 'Diary Reminder', {
            body: reminder.body || 'Time to write in your diary!',
            icon: reminder.icon || ICON_PATH,
            tag: reminder.id 
        }).catch(err => console.error('[SW] Error showing notification:', err));
        
        // Clear the timeoutId from the stored reminder
        if (remindersStore[reminder.id]) {
            delete remindersStore[reminder.id].timeoutId;
        }

        if (reminder.type === 'once') {
            delete remindersStore[reminder.id]; // Remove one-time reminder after it fires
             if (self.registration.active) {
                self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(clients => { // includeUncontrolled
                    clients.forEach(client => client.postMessage({ action: 'reminderFiredAndCleared', reminderId: reminder.id }));
                });
            }
        } else {
            // Re-schedule for daily/weekly reminders
            scheduleNotification(reminder); 
        }
    }, delay);

    // Store the reminder config and its timeoutId
    remindersStore[reminder.id] = { ...reminder, timeoutId: timeoutId };
}

self.addEventListener('message', event => {
    if (event.data && event.data.action) {
        console.log("[SW] Received message:", event.data);
        const reminderData = event.data.reminder;
        const reminderId = event.data.reminderId || (reminderData ? reminderData.id : null);

        if (event.data.action === 'setReminder' && reminderData) {
            remindersStore[reminderData.id] = reminderData; // Store/update
            scheduleNotification(reminderData);
        } else if (event.data.action === 'clearReminder' && reminderId) {
            if (remindersStore[reminderId] && remindersStore[reminderId].timeoutId) {
                clearTimeout(remindersStore[reminderId].timeoutId);
                console.log(`[SW] Cleared timeout for reminder ${reminderId}`);
            }
            delete remindersStore[reminderId];
            console.log(`[SW] Cleared reminder ${reminderId} from SW store.`);
        } else if (event.data.action === 'loadRemindersFallback' && reminderData) { // Fallback if SW was not active
            console.log("[SW] Fallback: received reminder data directly", reminderData);
            if (reminderData.id && !remindersStore[reminderData.id]) { // Only if not already set
                 remindersStore[reminderData.id] = reminderData;
                 scheduleNotification(reminderData);
            }
        }
    }
});

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(self.skipWaiting()); 
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        self.clients.claim().then(() => {
            console.log('[SW] Activated. Requesting clients to send stored reminders.');
            return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        }).then(clients => {
            clients.forEach(client => {
                client.postMessage({ action: 'swRequestsRemindersLoad' });
            });
        })
    );
});

console.log('Service Worker script loaded and running.');