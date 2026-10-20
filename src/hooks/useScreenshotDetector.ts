import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as LegacyMediaLibrary from 'expo-media-library/legacy';
import { ScreenshotAnalysis, isAppropriateScreenshot, isAppropriateCategory } from '../types';
import { MediaService, RetrievedPhoto } from '../services/mediaService';
import { AIService } from '../services/aiService';
import { ApiClient } from '../services/apiClient';
import { NotificationService } from '../services/notificationService';
import { StorageService } from '../services/storageService';
import { computeFastImageHash } from '../utils/crypto';
import {
  getFriendlyAnalysisError,
  getInappropriateScreenshotError,
  FormattedAnalysisError,
} from '../utils/errorUtils';

export interface PendingScreenshot {
  uri: string;
  id: string;
  status?: string;
  totalCount?: number;
  currentIndex?: number;
}

export function useScreenshotDetector(options?: {
  onScreenshotDetected?: (pending: PendingScreenshot) => void;
  onScreenshotAnalyzed?: (item: ScreenshotAnalysis, isManualPick?: boolean) => void;
  onAnalysisError?: (error: FormattedAnalysisError, isManualPick?: boolean) => void;
  onPastScreenshotsPending?: (pastScreenshots: RetrievedPhoto[]) => void;
}) {
  const [isListening, setIsListening] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [pendingItem, setPendingItem] = useState<PendingScreenshot | null>(null);
  const [activePromptItem, setActivePromptItem] = useState<ScreenshotAnalysis | null>(null);
  const [recentScreenshots, setRecentScreenshots] = useState<ScreenshotAnalysis[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<FormattedAnalysisError | null>(null);
  const [pendingPastScreenshots, setPendingPastScreenshots] = useState<RetrievedPhoto[]>([]);

  // Store options in a ref to avoid recreating callbacks on every parent re-render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const lastProcessedIdRef = useRef<string | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);
  const isServerOfflineRef = useRef<boolean>(false);
  const pastPromptDismissedRef = useRef<boolean>(false);
  const failedAssetIdsRef = useRef<Set<string>>(new Set());
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetOfflineState = useCallback(() => {
    isServerOfflineRef.current = false;
    pastPromptDismissedRef.current = false;
    failedAssetIdsRef.current.clear();
    setBannerError(null);
    setErrorMessage(null);
  }, []);

  const dismissPastScreenshotsPrompt = useCallback(() => {
    pastPromptDismissedRef.current = true;
    setPendingPastScreenshots([]);
  }, []);

  // Load initial history
  const loadInitialData = useCallback(async () => {
    const history = await StorageService.getScreenshots();
    setRecentScreenshots(history);
    if (history.length > 0 && !lastProcessedIdRef.current) {
      lastProcessedIdRef.current = history[0].id;
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    StorageService.getScreenshots().then((history) => {
      if (isSubscribed) {
        setRecentScreenshots(history);
        if (history.length > 0 && !lastProcessedIdRef.current) {
          lastProcessedIdRef.current = history[0].id;
        }
      }
    });

    return () => {
      isSubscribed = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Internal worker function to process and summarize a single screenshot
   */
  const processScreenshotInternal = useCallback(
    async (
      imageUri: string,
      externalId?: string,
      preloadedBase64?: string,
      processOptions?: { isManualPick?: boolean; silentNotification?: boolean; isBatch?: boolean }
    ): Promise<ScreenshotAnalysis | null> => {
      setErrorMessage(null);
      setBannerError(null);
      setAnalysisStatus('Reading screenshot pixels...');

      try {
        const currentSettings = await StorageService.getSettings();

        // Check if already analyzed by ID before reading bytes
        if (externalId) {
          const existingById = await StorageService.findExistingScreenshot({
            id: externalId,
            assetId: externalId,
          });
          if (existingById) {
            console.log(`[Deduplication] Screenshot already analyzed by ID: ${externalId}`);
            lastProcessedIdRef.current = externalId;
            if (isAppropriateScreenshot(existingById)) {
              setActivePromptItem(existingById);
              if (optionsRef.current?.onScreenshotAnalyzed) {
                optionsRef.current.onScreenshotAnalyzed(existingById, Boolean(processOptions?.isManualPick));
              }
            }
            return existingById;
          }
        }

        // Read bytes and calculate content fingerprint
        const base64Data = await AIService.getImageBase64(imageUri, preloadedBase64);
        const imgHash = base64Data ? computeFastImageHash(base64Data) : undefined;

        // Check deduplication engine by hash
        if (imgHash) {
          const existingByHash = await StorageService.findExistingScreenshot({ imageHash: imgHash });
          if (existingByHash) {
            console.log(`[Deduplication] Screenshot already analyzed by hash: ${imgHash}`);
            if (externalId) {
              lastProcessedIdRef.current = externalId;
              await StorageService.updateScreenshot(existingByHash.id, (prev) => ({
                ...prev,
                assetId: externalId,
              }));
            }
            if (isAppropriateScreenshot(existingByHash)) {
              setActivePromptItem(existingByHash);
              if (optionsRef.current?.onScreenshotAnalyzed) {
                optionsRef.current.onScreenshotAnalyzed(existingByHash, Boolean(processOptions?.isManualPick));
              }
            }
            return existingByHash;
          }

          const isIgnored = await StorageService.isAlreadyAnalyzed({
            id: externalId,
            assetId: externalId,
            imageHash: imgHash,
          });
          if (isIgnored) {
            console.log(`[Deduplication] Photo previously dismissed as personal/non-actionable`);
            if (externalId) lastProcessedIdRef.current = externalId;
            if (processOptions?.isManualPick) {
              const errorInfo = getInappropriateScreenshotError(
                'Personal or Non-Actionable',
                'This screenshot was previously filtered out because it does not contain actionable technical content or code.',
                imageUri
              );
              setErrorMessage(errorInfo.message);
              setBannerError(errorInfo);
              setPendingItem(null);
              if (optionsRef.current?.onAnalysisError) {
                optionsRef.current.onAnalysisError(errorInfo, true);
              }
            }
            return null;
          }
        }

        // 1. Smart Categorization Gatekeeper
        if (currentSettings.smartCategorizationEnabled !== false) {
          setAnalysisStatus('Categorization Engine is evaluating screenshot relevance...');
          const categorization = await AIService.classifyScreenshot(
            imageUri,
            base64Data
          );

          if (!categorization.isWorthAnalyzing || !isAppropriateCategory(categorization.category)) {
            console.log(
              `[CategorizationEngine] Photo skipped (${categorization.category}): ${categorization.reason}`
            );
            const ignoredId = externalId || `ignored-${Date.now()}`;
            lastProcessedIdRef.current = ignoredId;
            await StorageService.addIgnoredAssetId(ignoredId);
            if (imgHash) {
              await StorageService.addIgnoredHash(imgHash);
            }

            const errorInfo = getInappropriateScreenshotError(
              categorization.category,
              categorization.reason,
              imageUri
            );

            if (!processOptions?.isBatch) {
              setErrorMessage(errorInfo.message);
              setBannerError(errorInfo);
              setPendingItem(null);
            }

            if (optionsRef.current?.onAnalysisError) {
              optionsRef.current.onAnalysisError(errorInfo, Boolean(processOptions?.isManualPick));
            }
            return null;
          }
        }

        // If running as an individual single capture (not in batch), show single pending banner
        if (!processOptions?.isBatch) {
          const pending: PendingScreenshot = {
            uri: imageUri,
            id: externalId || `shot-${Date.now()}`,
            status: 'Analyzing visual content & generating contextual questions...',
          };
          setPendingItem(pending);
          if (optionsRef.current?.onScreenshotDetected) {
            optionsRef.current.onScreenshotDetected(pending);
          }
        }

        setAnalysisStatus('Analyzing visual content & generating contextual questions...');

        // Notify user if outside app (only for single isolated detections, NOT during batch)
        if (
          !processOptions?.silentNotification &&
          currentSettings.enableNotifications &&
          AppState.currentState !== 'active'
        ) {
          NotificationService.notifyScreenshotDetected();
        }

        const aiResult = await AIService.analyzeScreenshot(
          imageUri,
          base64Data
        );

        const newId = externalId || `shot-${Date.now()}`;
        lastProcessedIdRef.current = newId;

        const isWorth = aiResult.isWorthAnalyzing !== false && isAppropriateCategory(aiResult.category);
        const newAnalysisItem: ScreenshotAnalysis = {
          id: newId,
          imageUri,
          capturedAt: Date.now(),
          isReviewed: false,
          isWorthAnalyzing: isWorth,
          assetId: externalId,
          imageHash: imgHash || aiResult.imageHash,
          ...aiResult,
        };

        // Guard against any inappropriate screenshot before saving or showing prompt/notifications
        if (!isAppropriateScreenshot(newAnalysisItem)) {
          console.log(
            `[CategorizationEngine] Screenshot deemed inappropriate or non-actionable (${newAnalysisItem.category})`
          );
          await StorageService.addIgnoredAssetId(newId);
          if (imgHash) {
            await StorageService.addIgnoredHash(imgHash);
          }

          const errorInfo = getInappropriateScreenshotError(
            newAnalysisItem.category,
            newAnalysisItem.summary,
            imageUri
          );

          if (!processOptions?.isBatch) {
            setErrorMessage(errorInfo.message);
            setBannerError(errorInfo);
            setPendingItem(null);
          }

          if (optionsRef.current?.onAnalysisError) {
            optionsRef.current.onAnalysisError(errorInfo, Boolean(processOptions?.isManualPick));
          }
          return null;
        }

        // Successful analysis - reset any prior offline state
        isServerOfflineRef.current = false;
        if (externalId) {
          failedAssetIdsRef.current.delete(externalId);
        }

        // Save to persistent storage
        await StorageService.saveScreenshot(newAnalysisItem);
        setRecentScreenshots((prev) => [newAnalysisItem, ...prev.filter((i) => i.id !== newId)]);

        // Send local push notification only if user minimized or left the app (and NOT in batch)
        if (
          !processOptions?.silentNotification &&
          currentSettings.enableNotifications &&
          AppState.currentState !== 'active'
        ) {
          await NotificationService.notifyScreenshotAnalyzed(newAnalysisItem);
        }

        setActivePromptItem(newAnalysisItem);

        // Only fire individual analyzed callback if not in a batch
        if (!processOptions?.isBatch && optionsRef.current?.onScreenshotAnalyzed) {
          optionsRef.current.onScreenshotAnalyzed(newAnalysisItem, Boolean(processOptions?.isManualPick));
        }

        return newAnalysisItem;
      } catch (err: unknown) {
        const errorInfo = getFriendlyAnalysisError(err);
        console.error('Error analyzing screenshot:', err);
        setErrorMessage(errorInfo.message);
        setBannerError(errorInfo);

        if (errorInfo.isServerOffline) {
          isServerOfflineRef.current = true;
          if (pollingTimeoutRef.current) {
            clearTimeout(pollingTimeoutRef.current);
            pollingTimeoutRef.current = null;
          }
        }

        if (externalId) {
          failedAssetIdsRef.current.add(externalId);
        }

        if (optionsRef.current?.onAnalysisError) {
          optionsRef.current.onAnalysisError(errorInfo, Boolean(processOptions?.isManualPick));
        }

        return null;
      }
    },
    []
  );

  /**
   * Public core function to process and summarize a single screenshot URI
   */
  const processScreenshotUri = useCallback(
    async (
      imageUri: string,
      externalId?: string,
      preloadedBase64?: string,
      processOptions?: { isManualPick?: boolean; silentNotification?: boolean; isBatch?: boolean }
    ): Promise<ScreenshotAnalysis | null> => {
      if (isAnalyzingRef.current && !processOptions?.isBatch) return null;
      isAnalyzingRef.current = true;
      setIsAnalyzing(true);

      try {
        return await processScreenshotInternal(
          imageUri,
          externalId,
          preloadedBase64,
          processOptions
        );
      } finally {
        if (!processOptions?.isBatch) {
          isAnalyzingRef.current = false;
          setIsAnalyzing(false);
          setAnalysisStatus('');
          setPendingItem(null);
        }
      }
    },
    [processScreenshotInternal]
  );

  /**
   * Internal reusable runner for batch analyzing multiple screenshots
   */
  const runBatchAnalysisInternal = useCallback(
    async (candidates: RetrievedPhoto[]): Promise<number> => {
      if (candidates.length === 0) return 0;
      if (isAnalyzingRef.current) return 0;

      const totalCount = candidates.length;

      // CASE 1: Single screenshot
      if (totalCount === 1) {
        const targetScreenshot = candidates[0];
        lastProcessedIdRef.current = targetScreenshot.id;
        const result = await processScreenshotUri(targetScreenshot.uri, targetScreenshot.id, undefined, {
          isManualPick: false,
        });
        return result ? 1 : 0;
      }

      // CASE 2: Multiple screenshots (> 1)
      isAnalyzingRef.current = true;
      setIsAnalyzing(true);
      setErrorMessage(null);

      const currentSettings = await StorageService.getSettings();
      if (currentSettings.enableNotifications && AppState.currentState !== 'active') {
        await NotificationService.notifyBatchAnalysisStarted(totalCount);
      }

      const now = new Date();
      const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const toMs = (t: number) => (t < 1e11 ? t * 1000 : t);

      let analyzedCount = 0;
      let lastAnalyzedItem: ScreenshotAnalysis | null = null;

      for (let i = 0; i < candidates.length; i++) {
        if (isServerOfflineRef.current) {
          for (let j = i; j < candidates.length; j++) {
            failedAssetIdsRef.current.add(candidates[j].id);
          }
          break;
        }

        const candidate = candidates[i];
        lastProcessedIdRef.current = candidate.id;

        const isCandidateToday = toMs(candidate.creationTime) >= startOfTodayMs;
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const dayLabel = isCandidateToday
          ? 'Today'
          : toMs(candidate.creationTime) >= startOfTodayMs - ONE_DAY_MS
            ? 'Yesterday'
            : new Date(toMs(candidate.creationTime)).toLocaleDateString([], { month: 'short', day: 'numeric' });

        const pending: PendingScreenshot = {
          uri: candidate.uri,
          id: candidate.id,
          status: `Analyzing screenshot ${i + 1} of ${totalCount} (${dayLabel})...`,
          totalCount,
          currentIndex: i + 1,
        };
        setPendingItem(pending);
        if (optionsRef.current?.onScreenshotDetected) {
          optionsRef.current.onScreenshotDetected(pending);
        }

        const result = await processScreenshotInternal(candidate.uri, candidate.id, undefined, {
          isManualPick: false,
          silentNotification: true,
          isBatch: true,
        });

        if (result && isAppropriateScreenshot(result)) {
          analyzedCount++;
          lastAnalyzedItem = result;
        }
      }

      // Clear in-app progress state
      setPendingItem(null);
      setIsAnalyzing(false);
      isAnalyzingRef.current = false;
      setAnalysisStatus('');

      if (analyzedCount > 0 && currentSettings.enableNotifications && AppState.currentState !== 'active') {
        await NotificationService.notifyBatchAnalysisCompleted(analyzedCount, lastAnalyzedItem || undefined);
      }

      if (lastAnalyzedItem && optionsRef.current?.onScreenshotAnalyzed) {
        optionsRef.current.onScreenshotAnalyzed(lastAnalyzedItem, false);
      }

      return analyzedCount;
    },
    [processScreenshotInternal, processScreenshotUri]
  );

  /**
   * Scans camera roll for unanalyzed screenshots.
   * STRICT BEHAVIOR:
   * 1. Only present-day (Today) screenshots are analyzed automatically.
   * 2. Once completed, if previous days' screenshots are pending, prompts user to choose auto or manual.
   */
  const checkForNewScreenshot = useCallback(
    async (force = false): Promise<boolean> => {
      if (isCheckingRef.current || isAnalyzingRef.current) return false;
      if (!force && isServerOfflineRef.current) {
        return false;
      }

      isCheckingRef.current = true;
      try {
        const currentSettings = await StorageService.getSettings();
        if (!force && !currentSettings.autoAnalyzeScreenshots) {
          return false;
        }

        const history = await StorageService.getScreenshots();
        const ignoredIds = await StorageService.getIgnoredAssetIds();
        const processedIds = new Set([
          ...history.map((h) => h.id),
          ...history.filter((h) => h.assetId).map((h) => h.assetId as string),
          ...ignoredIds,
          ...Array.from(failedAssetIdsRef.current),
        ]);
        if (lastProcessedIdRef.current) processedIds.add(lastProcessedIdRef.current);

        const unanalyzed = await MediaService.getUnanalyzedScreenshots(processedIds);
        if (!unanalyzed || unanalyzed.length === 0) {
          setPendingPastScreenshots([]);
          return false;
        }

        const now = new Date();
        const startOfTodayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const toMs = (t: number) => (t < 1e11 ? t * 1000 : t);

        // Partition unanalyzed screenshots:
        // 1. Present day screenshots (taken today)
        // 2. Previous days' pending screenshots (taken on previous days when user didn't open the app)
        const todayScreenshots = unanalyzed.filter((s) => toMs(s.creationTime) >= startOfTodayMs);
        const previousDaysScreenshots = unanalyzed.filter((s) => toMs(s.creationTime) < startOfTodayMs);

        // Keep past screenshots within last 14 days (or all if force)
        const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
        const eligiblePastScreenshots = force
          ? previousDaysScreenshots
          : previousDaysScreenshots.filter((s) => startOfTodayMs - toMs(s.creationTime) <= FOURTEEN_DAYS_MS);

        // 1. AUTOMATICALLY ANALYZE ONLY PRESENT DAY SCREENSHOTS
        let todaySuccess = false;
        if (todayScreenshots.length > 0) {
          const todayCandidates = todayScreenshots.slice(0, 10);
          const count = await runBatchAnalysisInternal(todayCandidates);
          todaySuccess = count > 0;
        }

        // 2. ONCE PRESENT-DAY IS COMPLETED, CHECK IF PAST SCREENSHOTS EXIST AND PROMPT USER
        if (eligiblePastScreenshots.length > 0 && !pastPromptDismissedRef.current) {
          setPendingPastScreenshots(eligiblePastScreenshots);
          if (optionsRef.current?.onPastScreenshotsPending) {
            optionsRef.current.onPastScreenshotsPending(eligiblePastScreenshots);
          }
        } else if (eligiblePastScreenshots.length === 0) {
          setPendingPastScreenshots([]);
        }

        return todaySuccess;
      } catch (e) {
        console.warn('Error checking for new screenshots', e);
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
        setPendingItem(null);
        return false;
      } finally {
        isCheckingRef.current = false;
      }
    },
    [runBatchAnalysisInternal]
  );

  /**
   * User-approved action to analyze all pending past screenshots in batch
   */
  const analyzePastScreenshots = useCallback(
    async (customList?: RetrievedPhoto[]): Promise<number> => {
      const listToAnalyze = customList || pendingPastScreenshots;
      if (!listToAnalyze || listToAnalyze.length === 0) return 0;

      // Close pending prompt state
      setPendingPastScreenshots([]);
      pastPromptDismissedRef.current = true;

      // Run batch analysis on the past screenshots
      return await runBatchAnalysisInternal(listToAnalyze);
    },
    [pendingPastScreenshots, runBatchAnalysisInternal]
  );

  /**
   * Polls camera roll in staggered intervals.
   */
  const pollForNewScreenshot = useCallback(
    (maxAttempts = 5, delay = 700) => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }

      let attempt = 0;
      const step = async () => {
        if (isServerOfflineRef.current) {
          return;
        }
        attempt++;
        const found = await checkForNewScreenshot();
        if (!found && attempt < maxAttempts && !isServerOfflineRef.current) {
          pollingTimeoutRef.current = setTimeout(step, delay);
        }
      };

      step();
    },
    [checkForNewScreenshot]
  );

  /**
   * Scans recent camera roll photos to find unanalyzed screenshots
   */
  const scanRecentScreenshots = useCallback(
    async (): Promise<number> => {
      return (await checkForNewScreenshot(true)) ? 1 : 0;
    },
    [checkForNewScreenshot]
  );

  useEffect(() => {
    let screenCaptureSubscription: ScreenCapture.Subscription | null = null;
    let mediaLibrarySubscription: LegacyMediaLibrary.Subscription | null = null;

    const triggerDebouncedPoll = (attempts = 3, delay = 750) => {
      if (isServerOfflineRef.current) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        pollForNewScreenshot(attempts, delay);
      }, 350);
    };

    // 0. Immediate scan on initial mount (if server is not known to be offline)
    if (!isServerOfflineRef.current) {
      pollForNewScreenshot(3, 750);
    }

    // 1. Listen for in-app screenshot captures (power + volume buttons while inside app)
    try {
      screenCaptureSubscription = ScreenCapture.addScreenshotListener(() => {
        triggerDebouncedPoll(4, 750);
      });
    } catch (e) {
      console.warn('Failed to subscribe to ScreenCapture listener', e);
    }

    // 2. Listen to iOS Photo Library change notifications (debounced to avoid multiple triggers on disk write)
    try {
      mediaLibrarySubscription = LegacyMediaLibrary.addListener(() => {
        triggerDebouncedPoll(3, 750);
      });
    } catch (e) {
      console.warn('Failed to subscribe to MediaLibrary listener', e);
    }

    // 3. Listen for app foregrounding
    const appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (isServerOfflineRef.current) {
          ApiClient.checkHealth()
            .then(() => {
              isServerOfflineRef.current = false;
              failedAssetIdsRef.current.clear();
              setBannerError(null);
              setErrorMessage(null);
              triggerDebouncedPoll(3, 750);
            })
            .catch(() => {
              // Server is still offline
            });
        } else {
          triggerDebouncedPoll(3, 750);
        }
      }
    });

    return () => {
      if (screenCaptureSubscription) {
        screenCaptureSubscription.remove();
      }
      if (mediaLibrarySubscription) {
        mediaLibrarySubscription.remove();
      }
      appStateSubscription.remove();
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [checkForNewScreenshot, pollForNewScreenshot]);

  return {
    isListening,
    setIsListening,
    isAnalyzing,
    analysisStatus,
    pendingItem,
    setPendingItem,
    errorMessage,
    setErrorMessage,
    bannerError,
    setBannerError,
    dismissBannerError: () => setBannerError(null),
    resetOfflineState,
    pendingPastScreenshots,
    setPendingPastScreenshots,
    analyzePastScreenshots,
    dismissPastScreenshotsPrompt,
    activePromptItem,
    setActivePromptItem,
    recentScreenshots,
    refreshHistory: loadInitialData,
    processScreenshotUri,
    triggerScreenshotCheck: () => {
      resetOfflineState();
      pollForNewScreenshot(5, 600);
    },
    scanRecentScreenshots,
  };
}
