import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { ScreenshotAnalysis, isAppropriateScreenshot } from '../types';

export const NOTIFICATION_CATEGORY_ID = 'SCREENSHOT_ACTIONS';

// Guard against Expo Go on Android where expo-notifications push token logic throws at import time
let Notifications: typeof NotificationsType | null = null;

if (!(Platform.OS === 'android' && isRunningInExpoGo())) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('[NotificationService] Failed to load expo-notifications:', e);
  }
}

export const NotificationService = {
  /**
   * Initializes notification configuration, channels, and interactive action categories.
   */
  async configureNotifications(): Promise<boolean> {
    if (!Notifications) {
      if (__DEV__ && Platform.OS === 'android' && isRunningInExpoGo()) {
        console.warn(
          '[NotificationService] Notification services are disabled in Expo Go on Android (SDK 53+). Use a development build (npx expo run:android) to enable full notification alerts.'
        );
      }
      return false;
    }

    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure interactive notification actions category
      await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY_ID, [
        {
          identifier: 'VIEW_QUESTIONS',
          buttonTitle: '❓ View Questions',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'CREATE_TUTORIAL',
          buttonTitle: '📝 Create Tutorial',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'EXPLAIN_TUTORIAL',
          buttonTitle: '💡 Explain Concepts',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'CUSTOM_ACTION',
          buttonTitle: '✍️ Ask Question',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('screenshot-analysis', {
          name: 'Screenshot Analysis Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });
      }

      return true;
    } catch (e) {
      console.warn('Error setting up notifications', e);
      return false;
    }
  },

  /**
   * Fires immediate notification as soon as a new screenshot is detected and analysis starts
   */
  async notifyScreenshotDetected(): Promise<string | null> {
    if (!Notifications) return null;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '📸 New Screenshot Detected',
          body: 'Your summary for this item is almost ready...',
          data: {
            type: 'screenshot_detecting',
          },
          sound: true,
        },
        trigger: null, // deliver immediately
      });

      return notificationId;
    } catch (e) {
      console.warn('Failed to schedule detection notification', e);
      return null;
    }
  },

  /**
   * Fires a single consolidated notification when multiple screenshots are detected and batch analysis starts
   */
  async notifyBatchAnalysisStarted(count: number): Promise<string | null> {
    if (!Notifications) return null;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📸 ${count} Screenshots Detected`,
          body: 'Visual analysis is in progress. Summaries and action steps are being generated...',
          data: {
            type: 'batch_detecting',
            count,
          },
          sound: true,
        },
        trigger: null,
      });

      return notificationId;
    } catch (e) {
      console.warn('Failed to schedule batch detection notification', e);
      return null;
    }
  },

  /**
   * Fires a single consolidated notification when a batch analysis completes
   */
  async notifyBatchAnalysisCompleted(
    count: number,
    latestAnalysis?: ScreenshotAnalysis
  ): Promise<string | null> {
    if (!Notifications) return null;

    try {
      const title = count > 1 ? `✨ ${count} Screenshots Summarized` : '✨ Summary Ready';
      const body = latestAnalysis?.title
        ? `"${latestAnalysis.title.slice(0, 50)}..." Tap to review summaries and action steps.`
        : 'Your visual summaries are ready. Tap to explore actionable insights.';

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: {
            screenshotId: latestAnalysis?.id,
            type: 'batch_analyzed',
            count,
          },
          categoryIdentifier: NOTIFICATION_CATEGORY_ID,
          sound: true,
        },
        trigger: null,
      });

      return notificationId;
    } catch (e) {
      console.warn('Failed to schedule batch completion notification', e);
      return null;
    }
  },

  /**
   * Fires immediate notification reminding the user what was captured and summarized
   */
  async notifyScreenshotAnalyzed(analysis: ScreenshotAnalysis): Promise<string | null> {
    if (!Notifications) return null;
    if (!isAppropriateScreenshot(analysis)) return null;

    try {
      const topQuestion = analysis.followUpQuestions?.[0];
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Hey, you have a new screenshot.`,
          body: topQuestion
            ? `"${analysis.summary.slice(0, 75)}..."\n❓ ${topQuestion.slice(0, 70)}`
            : `"${analysis.summary.slice(0, 85)}..."\n👉 Tap to review summary & follow-up questions.`,
          data: {
            screenshotId: analysis.id,
            type: 'screenshot_analyzed',
          },
          categoryIdentifier: NOTIFICATION_CATEGORY_ID,
          sound: true,
        },
        trigger: null, // deliver immediately
      });

      // Also schedule a gentle reminder in 30 minutes in case user was busy
      this.scheduleFollowupReminder(analysis, 30);

      return notificationId;
    } catch (e) {
      console.warn('Failed to schedule notification', e);
      return null;
    }
  },

  /**
   * Schedules a delayed reminder so screenshots aren't forgotten
   */
  async scheduleFollowupReminder(
    analysis: ScreenshotAnalysis,
    delayMinutes = 30
  ): Promise<string | null> {
    if (!Notifications) return null;
    if (!isAppropriateScreenshot(analysis)) return null;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ Don't Forget: "${analysis.title.slice(0, 42)}"`,
          body: `You captured this screenshot earlier. Tap to review its summary, follow-up questions, and generated tutorials.`,
          data: {
            screenshotId: analysis.id,
            type: 'screenshot_reminder',
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delayMinutes * 60,
          repeats: false,
        },
      });

      return notificationId;
    } catch (e) {
      console.warn('Failed to schedule delayed reminder', e);
      return null;
    }
  },

  /**
   * Schedules a recurring end-of-day reminder ("Heads up! Your screenshots are worth a look.")
   */
  async scheduleDailyEveningNudge(hour = 20, minute = 0): Promise<string | null> {
    if (!Notifications) return null;

    try {
      await this.cancelDailyEveningNudge();

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Heads up!',
          body: 'You might have some unvisited screenshots.',
          data: {
            type: 'daily_nudge',
          },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });

      return notificationId;
    } catch (e) {
      console.warn('Failed to schedule daily evening nudge', e);
      return null;
    }
  },

  /**
   * Cancels previously scheduled daily evening nudges
   */
  async cancelDailyEveningNudge(): Promise<void> {
    if (!Notifications) return;

    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const notif of scheduled) {
        if (notif.content.data?.type === 'daily_nudge') {
          await Notifications.cancelScheduledNotificationAsync(notif.identifier);
        }
      }
    } catch (e) {
      console.warn('Failed to cancel scheduled daily nudge', e);
    }
  },

  /**
   * Fires an immediate test nudge alert so the user can verify the exact notification
   */
  async sendTestDailyNudge(): Promise<string | null> {
    if (!Notifications) return null;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Heads up!',
          body: 'You might have some unvisited screenshots.',
          data: {
            type: 'daily_nudge',
          },
          sound: true,
        },
        trigger: null, // deliver immediately
      });
      return id;
    } catch (e) {
      console.warn('Failed to send test daily nudge', e);
      return null;
    }
  },

  /**
   * Listen for user interactions with notification alerts / action buttons
   */
  addResponseListener(
    callback: (data: { screenshotId?: string; actionIdentifier?: string; type?: string }) => void
  ): { remove: () => void } {
    if (!Notifications) {
      return { remove: () => { } };
    }

    const defaultActionId = Notifications.DEFAULT_ACTION_IDENTIFIER;
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const screenshotId = data?.screenshotId ? String(data.screenshotId) : undefined;
        const type = data?.type ? String(data.type) : undefined;
        const actionIdentifier =
          response.actionIdentifier !== defaultActionId
            ? response.actionIdentifier
            : undefined;

        callback({ screenshotId, actionIdentifier, type });
      }
    );

    return {
      remove: () => subscription.remove(),
    };
  },
};
